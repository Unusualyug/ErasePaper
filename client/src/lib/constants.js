import {
  BookOpen,
  FileText,
  ChartNoAxesCombined,
  GraduationCap,
  Megaphone,
  FileSearch,
  SpellCheck,
  Bot,
} from 'lucide-react';
export const SERVICE_ICONS = {
  BookOpen,
  FileText,
  ChartNoAxesCombined,
  GraduationCap,
  Megaphone,
  FileSearch,
  SpellCheck,
  Bot,
};
export const SERVICE_COLORS = {
  purple: 'bg-brand-50 text-brand-600',
  blue: 'bg-blue-50 text-blue-600',
  teal: 'bg-teal-50 text-teal-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  orange: 'bg-orange-50 text-orange-600',
  violet: 'bg-violet-50 text-violet-600',
};
export const WHATSAPP_NUMBER = import.meta.env?.VITE_WHATSAPP_NUMBER || '919825751614';
export const normalizeContactNumber = (value) => {
  const input = String(value ?? '').trim();
  if (input.length > 32 || !/^\+?[1-9][0-9\s().-]*[0-9]$/.test(input)) return '';
  const digits = input.replace(/\D/g, '');
  if (!input.startsWith('+') && digits.length < 11) return '';
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
};
export const SUPPORT_EMAIL = import.meta.env?.VITE_SUPPORT_EMAIL || 'support@erasepaper.online';
export const formatPhoneNumber = (number = WHATSAPP_NUMBER) => {
  const digits = String(number).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `+${digits}`;
};
export const GENERAL_MESSAGE = 'Hello ErasePaper, I would like to enquire about your services.';
export const whatsappUrl = (number = WHATSAPP_NUMBER, message = GENERAL_MESSAGE) =>
  `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
export const phoneUrl = (number = WHATSAPP_NUMBER) => `tel:+${number.replace(/\D/g, '')}`;
export const formatDate = (date, withTime = false) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : 'Not available';
export const initials = (name) =>
  (name || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
export const timeAgo = (date) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date)) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};
export const FIELD_LABELS = {
  researchArea: 'Research area / domain',
  academicLevel: 'Academic level',
  citationStyle: 'Citation style',
  deadline: 'Preferred deadline',
  researchStage: 'Research stage',
  publicationTarget: 'Publication target',
  surveyScope: 'Survey scope',
  comparisonCriteria: 'Comparison criteria',
  documentType: 'Document type',
  copies: 'Copies',
  pageCount: 'Pages per copy',
  printType: 'Printing',
  binding: 'Binding',
  deliveryAddress: 'Delivery address',
  branch: 'Branch / department',
  college: 'College',
  technology: 'Technology / domain',
  projectStage: 'Project stage',
  businessName: 'Business or brand name',
  instagramHandle: 'Instagram business profile',
  industry: 'Business type or industry',
  primaryGoal: 'Primary marketing goal',
  supportNeeded: 'Main support needed',
  targetAudience: 'Target audience or location',
  preferredStartDate: 'Preferred start date',
  preferredPlatform: 'Preferred checking platform',
  reportType: 'Report support needed',
  reviewFocus: 'Main support needed',
  writingGoal: 'Main support needed',
  detectionTool: 'AI-detection tool or report',
  authorVoicePreference: 'Voice preference',
};
