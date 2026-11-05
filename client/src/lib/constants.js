import { BookOpen, FileText, ChartNoAxesCombined, Printer, GraduationCap } from 'lucide-react';
export const SERVICE_ICONS = { BookOpen, FileText, ChartNoAxesCombined, Printer, GraduationCap };
export const SERVICE_COLORS = {
  purple: 'bg-brand-50 text-brand-600',
  blue: 'bg-blue-50 text-blue-600',
  teal: 'bg-teal-50 text-teal-600',
  orange: 'bg-orange-50 text-orange-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};
export const WHATSAPP_NUMBER = import.meta.env?.VITE_WHATSAPP_NUMBER || '919825751614';
export const GENERAL_MESSAGE = 'Hello ErasePaper, I would like to enquire about your academic services.';
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
};
