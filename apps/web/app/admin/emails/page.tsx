'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import DOMPurify from 'dompurify';
import {
  Mail,
  Save,
  RotateCcw,
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Code,
  FileText,
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  content: string;
  variables: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_ICONS: Record<string, typeof Mail> = {
  VERIFICATION: Mail,
  PASSWORD_RESET: RotateCcw,
  INVITATION: FileText,
  WELCOME: CheckCircle,
};

const TEMPLATE_COLORS: Record<string, string> = {
  VERIFICATION: 'bg-blue-100 text-blue-700',
  PASSWORD_RESET: 'bg-orange-100 text-orange-700',
  INVITATION: 'bg-purple-100 text-purple-700',
  WELCOME: 'bg-green-100 text-green-700',
};

export default function AdminEmailsPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) {
      fetchTemplates();
    }
  }, [token]);

  const fetchTemplates = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/admin/email-templates', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data || []);
        if (data.data?.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data.data[0]);
          setEditSubject(data.data[0].subject);
          setEditContent(data.data[0].content);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setMessage({ type: 'error', text: 'Greška pri dohvaćanju predložaka' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditSubject(template.subject);
    setEditContent(template.content);
    setEditMode(false);
    setPreviewMode(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !token) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/v1/admin/email-templates/${selectedTemplate.type}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: editSubject,
          content: editContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(templates.map(t =>
          t.type === selectedTemplate.type ? data.data : t
        ));
        setSelectedTemplate(data.data);
        setEditMode(false);
        setMessage({ type: 'success', text: 'Predložak uspješno spremljen!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: 'error', text: 'Greška pri spremanju predloška' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate || !token) return;
    if (!confirm('Jeste li sigurni da želite vratiti predložak na zadane vrijednosti?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/email-templates/${selectedTemplate.type}/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(templates.map(t =>
          t.type === selectedTemplate.type ? data.data : t
        ));
        setSelectedTemplate(data.data);
        setEditSubject(data.data.subject);
        setEditContent(data.data.content);
        setEditMode(false);
        setMessage({ type: 'success', text: 'Predložak vraćen na zadane vrijednosti!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error resetting template:', error);
      setMessage({ type: 'error', text: 'Greška pri resetiranju predloška' });
    } finally {
      setSaving(false);
    }
  };

  const parseVariables = (varsJson: string): string[] => {
    try {
      return JSON.parse(varsJson);
    } catch {
      return [];
    }
  };

  const renderPreview = (content: string) => {
    // Replace variables with example values for preview
    const exampleValues: Record<string, string> = {
      firstName: 'Ivan',
      verifyUrl: 'https://kpd.2klika.hr/verify?token=xxx',
      resetUrl: 'https://kpd.2klika.hr/reset?token=xxx',
      inviterName: 'Marko Horvat',
      organizationName: 'Primjer d.o.o.',
      inviteUrl: 'https://kpd.2klika.hr/invite?token=xxx',
      dashboardUrl: 'https://kpd.2klika.hr/dashboard',
    };

    let preview = content;
    Object.entries(exampleValues).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return preview;
  };

  // Sanitize HTML content for safe rendering - admin-only content but still sanitized
  const sanitizedPreviewContent = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const rawHtml = renderPreview(editContent);
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
      ALLOWED_ATTR: ['href', 'style', 'class', 'target', 'rel'],
    });
  }, [editContent]);

  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Predlošci</h1>
            <p className="text-gray-500">Upravljanje sadržajem email poruka</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Template List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Predlošci</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {templates.map((template) => {
                    const Icon = TEMPLATE_ICONS[template.type] || Mail;
                    const colorClass = TEMPLATE_COLORS[template.type] || 'bg-gray-100 text-gray-700';

                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'bg-primary-50 border-l-4 border-primary-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {template.type}
                          </p>
                        </div>
                        {template.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variables Info */}
              {selectedTemplate && (
                <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Dostupne varijable
                  </h4>
                  <div className="space-y-2">
                    {parseVariables(selectedTemplate.variables).map((variable) => (
                      <div
                        key={variable}
                        className="flex items-center gap-2 text-xs"
                      >
                        <code className="px-2 py-1 bg-gray-100 rounded font-mono text-primary-700">
                          {`{{${variable}}}`}
                        </code>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Koristite ove varijable u sadržaju za dinamične vrijednosti.
                  </p>
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="lg:col-span-3">
              {selectedTemplate ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Editor Header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Zadnja izmjena: {new Date(selectedTemplate.updatedAt).toLocaleString('hr-HR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          previewMode
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        Pregled
                      </button>
                      {!editMode ? (
                        <button
                          onClick={() => setEditMode(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                        >
                          <Edit3 className="w-4 h-4" />
                          Uredi
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditSubject(selectedTemplate.subject);
                              setEditContent(selectedTemplate.content);
                              setEditMode(false);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Odustani
                          </button>
                          <button
                            onClick={handleReset}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 disabled:opacity-50"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                          >
                            {saving ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Spremi
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Editor Content */}
                  <div className="p-6">
                    {previewMode ? (
                      /* Preview Mode */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                          </label>
                          <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {renderPreview(editSubject)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pregled emaila
                          </label>
                          <div
                            className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                            style={{ maxHeight: '500px', overflowY: 'auto' }}
                          >
                            {/* Email Header Preview */}
                            <div
                              style={{
                                padding: '30px 40px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '12px 12px 0 0',
                                textAlign: 'center',
                              }}
                            >
                              <h1 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: 700 }}>
                                KPD 2klika
                              </h1>
                              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
                                Klasifikacija proizvoda i usluga
                              </p>
                            </div>
                            {/* Email Content Preview - sanitized with DOMPurify */}
                            <div
                              style={{
                                padding: '40px',
                                backgroundColor: 'white',
                                borderRadius: '0 0 12px 12px',
                              }}
                              dangerouslySetInnerHTML={{ __html: sanitizedPreviewContent }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Edit Mode */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject (naslov emaila)
                          </label>
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            disabled={!editMode}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sadržaj (HTML)
                          </label>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            disabled={!editMode}
                            rows={20}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            Koristite HTML za formatiranje. Varijable se zamjenjuju stvarnim vrijednostima pri slanju.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Mail className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Odaberite predložak za uređivanje</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
