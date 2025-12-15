import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dohvati organizaciju trenutnog korisnika
   */
  async getCurrentOrganization(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Nemate organizaciju');
    }

    return membership.organization;
  }

  /**
   * Dohvati organizaciju po ID-u
   */
  async findById(organizationId: string, userId: string) {
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

    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Ažuriraj organizaciju
   */
  async update(
    organizationId: string,
    userId: string,
    data: { name?: string },
  ) {
    // Verify user is OWNER or ADMIN
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

    if (membership.role === MemberRole.MEMBER) {
      throw new ForbiddenException(
        'Samo vlasnik ili admin mogu ažurirati organizaciju',
      );
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data,
    });
  }

  /**
   * Dohvati članove organizacije
   */
  async getMembers(organizationId: string, userId: string) {
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

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { joinedAt: 'asc' },
      ],
    });
  }

  /**
   * Ukloni člana iz organizacije
   */
  async removeMember(
    organizationId: string,
    memberId: string,
    requestingUserId: string,
  ) {
    // Verify requesting user is OWNER or ADMIN
    const requestingMembership =
      await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: requestingUserId,
          },
        },
      });

    if (!requestingMembership) {
      throw new ForbiddenException('Nemate pristup ovoj organizaciji');
    }

    if (requestingMembership.role === MemberRole.MEMBER) {
      throw new ForbiddenException('Samo vlasnik ili admin mogu ukloniti članove');
    }

    // Find target member
    const targetMembership = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.organizationId !== organizationId) {
      throw new NotFoundException('Član nije pronađen');
    }

    // Cannot remove OWNER
    if (targetMembership.role === MemberRole.OWNER) {
      throw new ForbiddenException('Ne možete ukloniti vlasnika organizacije');
    }

    // ADMIN cannot remove other ADMINs (only OWNER can)
    if (
      targetMembership.role === MemberRole.ADMIN &&
      requestingMembership.role !== MemberRole.OWNER
    ) {
      throw new ForbiddenException('Samo vlasnik može ukloniti administratore');
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return { success: true, message: 'Član uspješno uklonjen' };
  }

  /**
   * Promijeni ulogu člana
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: MemberRole,
    requestingUserId: string,
  ) {
    // Only OWNER can change roles
    const requestingMembership =
      await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: requestingUserId,
          },
        },
      });

    if (!requestingMembership || requestingMembership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Samo vlasnik može mijenjati uloge');
    }

    // Cannot change own role
    const targetMembership = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.organizationId !== organizationId) {
      throw new NotFoundException('Član nije pronađen');
    }

    if (targetMembership.userId === requestingUserId) {
      throw new ForbiddenException('Ne možete promijeniti vlastitu ulogu');
    }

    // Cannot assign OWNER role (transfer ownership is separate)
    if (newRole === MemberRole.OWNER) {
      throw new ForbiddenException(
        'Prijenos vlasništva nije podržan putem ovog endpointa',
      );
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
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
}
