import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemberRole, InvitationStatus } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Provjeri može li organizacija dodati novog člana s obzirom na limit plana
   * @returns true ako može dodati, false ako je limit dosegnut
   */
  private async canAddMember(organizationId: string): Promise<{ canAdd: boolean; currentCount: number; limit: number | null }> {
    // Dohvati subscription i plan config
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!subscription) {
      // Nema pretplate - koristi FREE plan default (1 član)
      const currentCount = await this.prisma.organizationMember.count({
        where: { organizationId },
      });
      return { canAdd: currentCount < 1, currentCount, limit: 1 };
    }

    // Dohvati plan config
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan: subscription.plan },
    });

    const membersLimit = planConfig?.membersLimit;
    const currentCount = subscription.organization._count.members;

    // null znači unlimited
    if (membersLimit === null || membersLimit === undefined) {
      return { canAdd: true, currentCount, limit: null };
    }

    // Broji i pending pozivnice kao "rezervirane" slotove
    const pendingInvitations = await this.prisma.invitation.count({
      where: {
        organizationId,
        status: InvitationStatus.PENDING,
      },
    });

    const totalUsed = currentCount + pendingInvitations;
    return { canAdd: totalUsed < membersLimit, currentCount: totalUsed, limit: membersLimit };
  }

  /**
   * Kreiraj pozivnicu
   */
  async createInvitation(
    organizationId: string,
    invitedById: string,
    email: string,
    role: MemberRole = MemberRole.MEMBER,
  ) {
    // Verify inviter is OWNER or ADMIN
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: invitedById,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Nemate pristup ovoj organizaciji');
    }

    if (membership.role === MemberRole.MEMBER) {
      throw new ForbiddenException(
        'Samo vlasnik ili admin mogu slati pozivnice',
      );
    }

    // Check if email already has pending invitation
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'Pozivnica za ovu email adresu već postoji',
      );
    }

    // Check if email is already member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (existingUser?.memberships?.length) {
      throw new ConflictException(
        'Korisnik s ovom email adresom već je član organizacije',
      );
    }

    // Cannot invite with OWNER role
    if (role === MemberRole.OWNER) {
      throw new ForbiddenException('Ne možete pozvati nekoga kao vlasnika');
    }

    // Only OWNER can invite ADMINs
    if (role === MemberRole.ADMIN && membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException(
        'Samo vlasnik može pozivati administratore',
      );
    }

    // Check member limit based on subscription plan
    const memberCheck = await this.canAddMember(organizationId);
    if (!memberCheck.canAdd) {
      const limitText = memberCheck.limit === 1 ? 'člana' : 'članova';
      throw new BadRequestException(
        `Dosegnuli ste limit od ${memberCheck.limit} ${limitText} za vaš plan. ` +
        `Nadogradite plan za više članova tima.`,
      );
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        organizationId,
        invitedById,
        role,
        expiresAt,
      },
    });
  }

  /**
   * Dohvati pozivnice organizacije
   */
  async getOrganizationInvitations(organizationId: string, userId: string) {
    // Verify user has access
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Nemate pristup ovoj organizaciji');
    }

    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Otkaži pozivnicu
   */
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Pozivnica nije pronađena');
    }

    // Verify user is OWNER or ADMIN
    const membership = invitation.organization.members[0];
    if (!membership) {
      throw new ForbiddenException('Nemate pristup ovoj organizaciji');
    }

    if (membership.role === MemberRole.MEMBER) {
      throw new ForbiddenException(
        'Samo vlasnik ili admin mogu otkazati pozivnice',
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('Ova pozivnica nije više aktivna');
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });
  }

  /**
   * Prihvati pozivnicu
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Pozivnica nije pronađena');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('Ova pozivnica nije više aktivna');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new ConflictException('Pozivnica je istekla');
    }

    // Verify user email matches invitation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'Pozivnica nije namijenjena ovom korisniku',
      );
    }

    // Check if already member
    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('Već ste član ove organizacije');
    }

    // Double-check member limit (in case it changed since invitation was sent)
    // Note: We count current members only (not pending invitations) because this invitation
    // was already counted when it was created
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: invitation.organizationId },
    });

    if (subscription) {
      const planConfig = await this.prisma.planConfig.findUnique({
        where: { plan: subscription.plan },
      });

      if (planConfig?.membersLimit) {
        const currentMemberCount = await this.prisma.organizationMember.count({
          where: { organizationId: invitation.organizationId },
        });

        if (currentMemberCount >= planConfig.membersLimit) {
          throw new BadRequestException(
            'Organizacija je dosegnula maksimalan broj članova. ' +
            'Kontaktirajte vlasnika organizacije za nadogradnju plana.',
          );
        }
      }
    }

    // Accept invitation and create membership
    await this.prisma.$transaction([
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      }),
      this.prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      }),
    ]);

    return { success: true, message: 'Pozivnica prihvaćena' };
  }

  /**
   * Dohvati pozivnicu po tokenu
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Pozivnica nije pronađena');
    }

    return invitation;
  }
}
