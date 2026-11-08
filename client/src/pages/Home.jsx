import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  Check,
  Plus,
  Minus,
  FileCheck2,
  Layers3,
  Truck,
  Compass,
  UserRoundPlus,
  Send,
  BadgeCheck,
  BookOpenCheck,
} from 'lucide-react';
import { useServices } from '../context/ServicesContext';
import { useAppAuth } from '../context/AuthContext';
import { SERVICE_ICONS, SERVICE_COLORS, whatsappUrl } from '../lib/constants';
import { Reveal, CheckItem } from '../components/UI';
import { WhatsAppIcon } from '../components/WhatsAppButton';

const faqs = [
  [
    'What is ErasePaper?',
    'ErasePaper brings five academic support services together in one place: literature review guidance, research paper support, survey papers, bulk printing with manual creation, and final-year project mentoring. Create an account, tell us what you need, and follow your request from your dashboard.',
  ],
  [
    'Do you complete assignments or assessed work for students?',
    'No. Our research and project services provide academic assistance, mentoring, editing, and documentation support. You remain responsible for your own research, learning, implementation, and submission. We do not complete assessed work on your behalf or guarantee grades, acceptance, or publication.',
  ],
  [
    'How do I get started?',
    'Create an account with an email, username, mobile number, and password. Email and phone are not verified. When live email delivery is configured, we send a welcome email and a receipt when you submit a service request; no email-verification message, OTP, or SMS is sent. The demo sends no emails. Then submit a short service request or contact us directly on WhatsApp to discuss your requirements.',
  ],
  [
    'Is manual creation really included with bulk printing?',
    'Yes. Manual creation is included at no additional charge with our bulk printing service. Printing, binding, and delivery costs depend on your requirements and are confirmed in your quotation before you proceed.',
  ],
  [
    'Can I track my request after submitting it?',
    'Absolutely. Your student dashboard shows each request with a unique request ID and its current status: Pending, In Progress, Completed, or Cancelled. You will also receive an in-dashboard notification when the administrator updates your status.',
  ],
  [
    'Is my personal information secure?',
    'ErasePaper uses your email address and password to sign you in. Passwords are stored as one-way hashes, and your requests are accessible only to you and authorized administrators. Email addresses and mobile numbers are not verified. When live email delivery is configured, welcome and service-request receipt emails may be sent; no verification email or SMS is sent.',
  ],
];
function ServiceCard({ service, index, user }) {
  const Icon = SERVICE_ICONS[service.icon] || BookOpenCheck;
  return (
    <Reveal delay={(index % 3) * 0.06} className="h-full">
      <article className="service-card group flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <span className={`icon-box ${SERVICE_COLORS[service.color]}`}>
            <Icon size={23} strokeWidth={1.65} />
          </span>
          <span className="text-xs font-medium tracking-widest text-slate-300">{service.number}</span>
        </div>
        <h3 className="text-[17px] font-bold tracking-[-.025em]">{service.name}</h3>
        <p className="mb-5 mt-3 text-[12px] leading-[1.85] text-slate-500">{service.description}</p>
        <ul className="mb-6 space-y-2.5">
          {service.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[11px] leading-relaxed text-navy-500">
              <Check size={13} className="mt-0.5 shrink-0 text-brand-500" />
              {feature}
            </li>
          ))}
        </ul>
        {service.highlight && (
          <span className="mb-5 w-fit rounded-md bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-700">
            {service.highlight}
          </span>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <Link
            to={user ? `/requests/new?service=${service.slug}` : `/sign-up?service=${service.slug}`}
            className="service-card-link flex items-center gap-2 text-xs font-semibold text-brand-600"
          >
            {service.slug === 'bulk-printing' ? 'Get a printing quote' : 'Explore this service'}
            <ArrowRight size={15} className="service-arrow" />
          </Link>
          <a
            href={whatsappUrl(undefined, `Hello ErasePaper, I would like to enquire about ${service.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Enquire about ${service.name} on WhatsApp`}
            className="service-whatsapp-link rounded-md p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
          >
            <WhatsAppIcon size={17} />
          </a>
        </div>
      </article>
    </Reveal>
  );
}
export default function Home() {
  const services = useServices();
  const { user } = useAppAuth();
  const [faq, setFaq] = useState(0);
  const reduced = useReducedMotion();
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-site grid items-center gap-6 pb-12 pt-8 sm:gap-8 sm:pb-16 sm:pt-10 md:min-h-[610px] md:grid-cols-[1.15fr_1fr] md:pb-20 md:pt-14">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-[10px] font-semibold text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />A little support. A big difference.
            </span>
            <h1 className="max-w-[600px] text-[clamp(2.375rem,12vw,2.875rem)] font-bold leading-[1.08] tracking-[-.055em] text-navy-900 sm:text-[60px] sm:leading-[1.12] lg:text-[66px]">
              Your academic
              <br className="hidden lg:block" /> journey,
              <br />
              <span className="relative inline-block text-brand-600">
                simplified.
                <svg
                  className="absolute -bottom-2 left-0 w-[98%]"
                  height="11"
                  viewBox="0 0 340 11"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 7C87 0 219 0 337 6" stroke="#C5B5F4" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-[435px] text-[14px] leading-[1.8] text-slate-500 sm:mt-8 sm:leading-[1.95]">
              From research papers and survey papers to final-year project guidance and doorstep printing,
              ErasePaper brings essential academic services together in one place.
            </p>
            <div className="hero-actions mt-6 flex flex-wrap gap-3 sm:mt-8">
              <a href="#services" className="btn-primary">
                Explore our services
                <ArrowRight size={17} />
              </a>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <WhatsAppIcon size={19} className="text-[#168c62]" />
                Contact us on WhatsApp
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-brand-500" />
                Secure mobile sign-in
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={14} className="text-brand-500" />
                Direct, personal support
              </span>
            </div>
          </motion.div>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative mx-auto mt-2 w-full max-w-[445px] pb-7 pl-5 pr-3 sm:mt-5 md:mt-0"
          >
            <div className="absolute bottom-0 right-0 h-40 w-44 hero-dots opacity-75" />
            <div className="absolute -right-1 left-9 top-7 h-[92%] rounded-[48%_48%_16px_16px] border border-brand-200" />
            <div className="hero-arch relative h-[clamp(15rem,72vw,20rem)] overflow-hidden bg-[#d8d0fa] sm:h-[340px] md:h-[420px] lg:h-[465px]">
              <img
                src="/images/student-hero.webp"
                alt="A university student holding notebooks, ready for his next academic step"
                className="h-full w-full object-cover object-[50%_25%]"
                width={886}
                height={1100}
                decoding="async"
                fetchpriority="high"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#cfc4f2]/30 to-transparent" />
            </div>
            <div className="absolute -left-2 top-20 flex items-center gap-2.5 rounded-xl border border-white bg-white p-3 pr-5 shadow-soft sm:-left-6">
              <span className="rounded-lg bg-brand-50 p-2 text-brand-600">
                <BookOpenCheck size={20} />
              </span>
              <div>
                <p className="text-[11px] font-bold">Big goals. Clear steps.</p>
                <p className="mt-0.5 text-[9px] text-slate-400">Guidance that moves you forward</p>
              </div>
            </div>
            <div className="absolute -right-1 bottom-14 flex items-center gap-3 rounded-xl border border-white bg-white p-3.5 pr-6 shadow-soft sm:-right-4">
              <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                <Check size={19} />
              </span>
              <div>
                <p className="text-[11px] font-bold">5 services. One place.</p>
                <p className="mt-0.5 text-[9px] text-slate-400">Less running around. More progress.</p>
              </div>
            </div>
            <span className="absolute right-4 top-4 rotate-12 text-brand-400">
              <Sparkles size={31} strokeWidth={1.4} />
            </span>
          </motion.div>
        </div>
      </section>
      <section className="border-y border-slate-100 bg-[#fafbfe]">
        <div className="container-site flex flex-wrap items-center justify-between gap-6 py-7">
          <p className="text-[11px] font-medium leading-5 text-slate-400">
            Made for the moments
            <br />
            <span className="font-semibold text-navy-700">that matter in your education.</span>
          </p>
          {[
            [Compass, 'Find your direction'],
            [FileCheck2, 'Strengthen your work'],
            [Layers3, 'Organise your research'],
            [Truck, 'Get it delivered'],
          ].map(([Icon, text]) => (
            <span key={text} className="flex items-center gap-2.5 text-[12px] font-semibold text-navy-500">
              <Icon size={21} strokeWidth={1.5} className="text-slate-400" />
              {text}
            </span>
          ))}
        </div>
      </section>
      <section id="services" className="bg-[#f8f9fc] py-14 sm:py-20 lg:py-24">
        <div className="container-site">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow mb-3">Support at every step</p>
              <h2 className="section-title">
                The right support.
                <br />
                Right where you need it.
              </h2>
            </div>
            <p className="max-w-[340px] text-[13px] leading-7 text-slate-500">
              Five focused services to help you learn, create, and move forward—with clarity and confidence.
            </p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <ServiceCard key={service.slug} service={service} index={index} user={user} />
            ))}
            <Reveal delay={0.12} className="h-full">
              <div className="flex h-full min-h-[240px] flex-col justify-center rounded-xl bg-brand-600 sm:min-h-[300px] p-7 text-white">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <MessageCircle size={23} strokeWidth={1.5} />
                </span>
                <h3 className="text-2xl font-semibold leading-snug tracking-[-.035em]">
                  Not sure where
                  <br />
                  to begin?
                </h3>
                <p className="mb-6 mt-3 text-xs leading-6 text-brand-100">
                  Tell us what you’re working on. We’ll help you find the right next step.
                </p>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-4 rounded-lg bg-white px-4 py-3 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
                >
                  Let’s figure it out
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>
          <p className="mt-6 flex items-start justify-center gap-2 text-center text-[10px] leading-relaxed text-slate-400">
            <ShieldCheck size={13} className="shrink-0" />
            We support your learning. Research and project services are for mentoring, editing, and
            guidance—not completing assessed work.
          </p>
        </div>
      </section>
      <section id="why-us" className="py-14 sm:py-20 lg:py-24">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="relative rounded-2xl bg-[#f1eefc] p-7 sm:p-10">
            <div className="mb-9 flex items-center gap-2 text-[11px] font-semibold text-brand-700">
              <span className="rounded-md bg-white p-1.5">
                <Sparkles size={15} />
              </span>
              LESS OVERWHELM. MORE MOMENTUM.
            </div>
            <div className="relative mx-auto max-w-sm rotate-[-3deg] rounded-xl border border-brand-100 bg-white p-6 shadow-soft">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs font-bold">Your next chapter</span>
                <span className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-600">
                  In progress
                </span>
              </div>
              <div className="space-y-5">
                {[
                  'Find a direction for your research',
                  'Bring your ideas together',
                  'Make your next submission count',
                ].map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <span
                      className={`rounded-full p-1 ${i < 2 ? 'bg-brand-100 text-brand-600' : 'border border-slate-200 text-slate-300'}`}
                    >
                      {i < 2 ? <Check size={12} /> : <span className="block h-3 w-3" />}
                    </span>
                    <span className={`text-[11px] ${i < 2 ? 'text-navy-700' : 'text-slate-400'}`}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 rounded-full bg-brand-500" />
              </div>
              <p className="mt-2 text-right text-[9px] text-slate-400">One step at a time.</p>
            </div>
            <div className="relative -mt-1 ml-auto flex w-fit items-center gap-3 rotate-[3deg] rounded-lg bg-navy-900 px-5 py-4 text-white shadow-soft">
              <BadgeCheck size={25} className="text-brand-300" />
              <div>
                <p className="text-xs font-semibold">Your ambition. Our support.</p>
                <p className="mt-1 text-[10px] text-slate-400">A partnership in your progress.</p>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <p className="eyebrow mb-3">The ErasePaper difference</p>
            <h2 className="section-title">
              More than a service.
              <br />A smoother way forward.
            </h2>
            <p className="mt-5 max-w-md text-[13px] leading-7 text-slate-500">
              College is challenging enough. Getting academic support shouldn’t be.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                [
                  Compass,
                  'Guidance with purpose',
                  'Practical, focused support that helps you do your own best work.',
                ],
                [
                  MessageCircle,
                  'A real conversation',
                  'No support mazes. Connect directly with us on WhatsApp.',
                ],
                [
                  Layers3,
                  'Everything, together',
                  'Research, project guidance, and printing in one simple workspace.',
                ],
                [
                  FileCheck2,
                  'Clarity at every stage',
                  'Know what’s happening with transparent request tracking.',
                ],
              ].map(([Icon, title, text]) => (
                <div key={title}>
                  <Icon size={21} strokeWidth={1.6} className="mb-3 text-brand-600" />
                  <h3 className="text-[13px] font-bold">{title}</h3>
                  <p className="mt-2 text-[11px] leading-6 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
      <section id="how-it-works" className="border-y border-slate-100 bg-[#fafbfe] py-14 sm:py-20">
        <div className="container-site">
          <Reveal className="text-center">
            <p className="eyebrow mb-3">From “what next?” to “let’s go”</p>
            <h2 className="section-title">Three steps. A clearer path.</h2>
            <p className="mt-4 text-[13px] text-slate-500">Getting started is as simple as it should be.</p>
          </Reveal>
          <div className="relative mt-12 grid gap-9 md:grid-cols-3">
            {[
              [
                UserRoundPlus,
                'Make yourself at home',
                'Create your account with an email address, username, mobile number, and password. Email is not verified. When live email delivery is configured, you receive a welcome email and a service-request receipt; no verification email, OTP, or SMS is sent.',
              ],
              [
                Send,
                'Tell us what you need',
                'Pick a service, share your requirements, and send your request. We’ll take it from there.',
              ],
              [
                BadgeCheck,
                'Follow your progress',
                'Track your request, connect with us, and take your next academic step with confidence.',
              ],
            ].map(([Icon, title, text], i) => (
              <Reveal key={title} delay={i * 0.1} className="relative text-center">
                <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-600 shadow-card">
                  <Icon size={27} strokeWidth={1.5} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold">{title}</h3>
                <p className="mx-auto mt-3 max-w-[280px] text-xs leading-6 text-slate-500">{text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to={user ? '/requests/new' : '/sign-up'} className="btn-primary">
              Let’s get started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section id="faqs" className="py-14 sm:py-20 lg:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <p className="eyebrow mb-3">A little more clarity</p>
            <h2 className="section-title">
              Good questions.
              <br />
              Straight answers.
            </h2>
            <p className="mt-5 max-w-xs text-[13px] leading-7 text-slate-500">
              Can’t find what you’re looking for? We’re happy to help you figure it out.
            </p>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-brand-600"
            >
              Ask us on WhatsApp
              <ArrowUpRight size={16} />
            </a>
          </Reveal>
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {faqs.map(([question, answer], i) => (
              <div key={question}>
                <h3>
                  <button
                    className="flex w-full items-center justify-between gap-5 py-5 text-left text-[13px] font-semibold"
                    aria-expanded={faq === i}
                    aria-controls={`faq-${i}`}
                    onClick={() => setFaq(faq === i ? null : i)}
                  >
                    {question}
                    <span
                      className={`shrink-0 rounded-full p-1 ${faq === i ? 'bg-brand-50 text-brand-600' : 'text-slate-400'}`}
                    >
                      {faq === i ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                  </button>
                </h3>
                {faq === i && (
                  <motion.div
                    id={`faq-${i}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 pr-8 text-xs leading-7 text-slate-500">{answer}</p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-site pb-14 sm:pb-20">
        <Reveal className="relative overflow-hidden rounded-2xl bg-navy-900 px-7 py-12 text-white sm:px-12">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[45px] border-white/[.025]" />
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.15em] text-brand-300">
                Your next step starts here
              </p>
              <h2 className="text-3xl font-semibold leading-tight tracking-[-.04em]">
                Make room for what’s next.
              </h2>
              <p className="mt-3 text-xs leading-6 text-slate-400">
                A little clarity and the right support can make all the difference.
              </p>
            </div>
            <Link
              to={user ? '/requests/new' : '/sign-up'}
              className="btn bg-white text-navy-900 hover:bg-brand-50"
            >
              Start your journey
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
