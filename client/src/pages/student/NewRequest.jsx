import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  UploadCloud,
  X,
  Paperclip,
  ShieldCheck,
  LoaderCircle,
  Sparkles,
} from 'lucide-react';
import { useServices } from '../../context/ServicesContext';
import { useToast } from '../../context/ToastContext';
import { SERVICE_ICONS, SERVICE_COLORS } from '../../lib/constants';
import { PageHeading, ErrorState } from '../../components/UI';
import api, { errorMessage } from '../../lib/api';
export default function NewRequest() {
  const services = useServices();
  const [params] = useSearchParams();
  const [slug, setSlug] = useState(
    services.some((s) => s.slug === params.get('service')) ? params.get('service') : services[0].slug,
  );
  const service = services.find((s) => s.slug === slug) || services[0];
  const [details, setDetails] = useState({}),
    [files, setFiles] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  const fileInput = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();
  function changeService(value) {
    setSlug(value);
    setDetails({});
    setError('');
  }
  function addFiles(list) {
    const added = Array.from(list);
    const valid = [];
    for (const file of added) {
      if (!/\.(pdf|docx?|png|jpg|txt)$/i.test(file.name)) {
        setError('Please use PDF, DOC, DOCX, PNG, JPG or TXT files.');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      valid.push(file);
    }
    if (files.length + valid.length > 3) setError('You can attach up to 3 files per request.');
    setFiles((current) =>
      [
        ...current,
        ...valid.filter((f) => !current.some((c) => c.name === f.name && c.size === f.size)),
      ].slice(0, 3),
    );
  }
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      serviceSlug: slug,
      title: form.get('title').trim(),
      description: form.get('description').trim(),
      additionalInfo: form.get('additionalInfo').trim(),
      integrityAcknowledged: form.get('integrity') === 'on',
      details: Object.fromEntries(
        service.fields.map((f) => [
          f.key,
          f.type === 'number' ? (details[f.key] ? Number(details[f.key]) : undefined) : details[f.key] || '',
        ]),
      ),
    };
    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) =>
      data.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value)),
    );
    files.forEach((file) => data.append('attachments', file));
    try {
      const response = await api.post('/requests', data);
      toast('Request submitted. We’ll be in touch with your next steps.');
      navigate(`/requests?request=${response.data.request.id}`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        to="/requests"
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} />
        Back to my requests
      </Link>
      <PageHeading
        eyebrow="Let’s take the next step"
        title="Tell us what you’re working on."
        description="A few details now. A clearer path forward."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_285px]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-6">
            <h2 className="mb-4 text-sm font-bold">
              <span className="mr-2 text-brand-600">01</span>Choose your service
            </h2>
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
              {services.map((s) => {
                const Icon = SERVICE_ICONS[s.icon];
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => changeService(s.slug)}
                    aria-pressed={slug === s.slug}
                    className={`flex min-h-12 items-center gap-2 rounded-lg border p-3 text-left text-xs font-medium transition ${slug === s.slug ? 'border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-400' : 'border-slate-200 text-slate-500 hover:border-brand-200'}`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {s.shortName}
                    {slug === s.slug && <Check size={12} className="ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <form onSubmit={submit} className="space-y-5 p-6" key={slug}>
            <h2 className="text-sm font-bold">
              <span className="mr-2 text-brand-600">02</span>Share your requirements
            </h2>
            <div>
              <label htmlFor="title" className="label">
                Project title or topic <span className="text-brand-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                className="input"
                placeholder={
                  slug === 'bulk-printing'
                    ? 'e.g. Semester 6 laboratory manuals'
                    : 'Give your request a clear, short title'
                }
                required
                minLength={5}
                maxLength={160}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {service.fields.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label htmlFor={field.key} className="label">
                    {field.label}
                    {field.required && <span className="text-brand-500"> *</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      id={field.key}
                      className="input"
                      required={field.required}
                      value={details[field.key] || ''}
                      onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))}
                    >
                      <option value="">Select an option</option>
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={field.key}
                      className="input min-h-24"
                      required={field.required}
                      value={details[field.key] || ''}
                      maxLength={1500}
                      placeholder="Include your full delivery address and PIN code"
                      onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      id={field.key}
                      className="input"
                      type={field.type}
                      required={field.required}
                      min={
                        field.type === 'date'
                          ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                              .toISOString()
                              .slice(0, 10)
                          : field.min
                      }
                      max={field.max}
                      value={details[field.key] || ''}
                      placeholder={field.placeholder || ''}
                      onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div>
              <label htmlFor="description" className="label">
                What do you need help with? <span className="text-brand-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                className="input min-h-32"
                placeholder="Tell us about your requirements, where you are in the process, and the support you’re looking for…"
                required
                minLength={20}
                maxLength={6000}
              />
              <p className="hint">
                At least 20 characters. Please don’t include passwords or sensitive personal information.
              </p>
            </div>
            <div>
              <label htmlFor="additionalInfo" className="label">
                Anything else we should know? <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                className="input min-h-20"
                maxLength={3000}
                placeholder="Preferred contact time, additional context, or specific questions"
              />
            </div>
            <div>
              <label className="label">
                Supporting documents <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex w-full flex-col items-center rounded-xl border border-dashed p-6 transition ${drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50 hover:border-brand-400'}`}
              >
                <UploadCloud size={25} className="mb-2 text-brand-500" />
                <span className="text-xs text-slate-500">
                  <strong className="font-semibold text-brand-600">Click to upload</strong> or drag and drop
                </span>
                <span className="mt-1.5 text-[10px] text-slate-400">
                  PDF, DOC, DOCX, PNG, JPG, TXT · Up to 3 files, 10 MB each
                </span>
              </button>
              <input
                type="file"
                ref={fileInput}
                className="sr-only"
                tabIndex={-1}
                accept=".pdf,.doc,.docx,.png,.jpg,.txt"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
                aria-label="Upload supporting documents"
              />
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs"
                    >
                      <Paperclip size={14} className="text-brand-500" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles((f) => f.filter((_, index) => index !== i))}
                        aria-label={`Remove ${file.name}`}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-brand-50 p-4">
              <input
                type="checkbox"
                name="integrity"
                required
                className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
              />
              <span className="text-[11px] leading-6 text-navy-700">
                I understand that research and project services provide mentoring, editing, and documentation
                support. I remain responsible for my own assessed work. Printing services cover document
                preparation and printing.
              </span>
            </label>
            {error && <ErrorState message={error} />}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck size={13} />
                Your requirements stay private.
              </span>
              <button className="request-submit-button btn-primary sm:w-auto" disabled={busy}>
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
                {busy ? 'Submitting…' : 'Submit request'}
                {!busy && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>
        <aside className="space-y-5">
          <div className="card p-5">
            <span className={`icon-box mb-4 ${SERVICE_COLORS[service.color]}`}>
              {(() => {
                const Icon = SERVICE_ICONS[service.icon];
                return <Icon size={24} strokeWidth={1.6} />;
              })()}
            </span>
            <p className="eyebrow mb-2">Service {service.number}</p>
            <h2 className="text-lg font-bold leading-snug">{service.name}</h2>
            <p className="mt-3 text-xs leading-6 text-slate-500">{service.tagline}</p>
            <ul className="mt-5 space-y-3">
              {service.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                  <Check size={13} className="mt-0.5 shrink-0 text-brand-600" />
                  {feature}
                </li>
              ))}
            </ul>
            {service.highlight && (
              <p className="mt-5 rounded-lg bg-orange-50 p-3 text-[11px] font-semibold text-orange-700">
                {service.highlight} at no additional charge.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-5">
            <Sparkles size={21} className="mb-3 text-brand-600" />
            <h3 className="text-xs font-bold">What happens next?</h3>
            <ol className="mt-3 space-y-3 text-[11px] leading-5 text-slate-500">
              <li>1. We review your requirements.</li>
              <li>2. We connect with you to discuss the next steps.</li>
              <li>3. Follow your request status in your dashboard.</li>
            </ol>
            <p className="mt-4 border-t border-brand-100 pt-3 text-[10px] leading-5 text-slate-400">
              Submitting a request is free. Any service costs are discussed and agreed before work begins.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
