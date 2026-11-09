import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { formatPhoneNumber, phoneUrl, SUPPORT_EMAIL, whatsappUrl } from '../lib/constants';

function LegalPage({ title, eyebrow, intro, children }) {
  return (
    <div className="legal-page container-site mx-auto max-w-[920px] py-12 sm:py-16">
      <Link to="/" className="legal-back-link">
        <ArrowLeft size={15} />
        Back to ErasePaper
      </Link>
      <p className="eyebrow mt-9">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">{title}</h1>
      <p className="legal-intro mt-4 max-w-3xl text-sm leading-7">{intro}</p>
      <p className="legal-updated mt-4 text-xs">Last updated: 3 November 2026</p>
      <div className="legal-content mt-9 space-y-8">{children}</div>
      <div className="legal-contact mt-12 rounded-2xl border p-5 sm:p-6">
        <ShieldCheck className="mb-3 text-brand-600" size={21} />
        <h2 className="text-base font-semibold">Questions about your information?</h2>
        <p className="mt-2 text-sm leading-6">
          Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          , call <a href={phoneUrl()}>{formatPhoneNumber()}</a>, or{' '}
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
            message us on WhatsApp
          </a>
          . Please do not include your password in a message.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7">{children}</div>
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      intro="This page explains the information ErasePaper processes to provide academic mentoring, editing, documentation, printing and delivery services. Use the contact details below to ask a question or request access, correction or deletion."
    >
      <Section title="Information we process">
        <p>
          When you create an account, we process your email address, username, mobile number, password hash,
          and account and sign-in timestamps. Email addresses and mobile numbers are not verified and are not
          proof of identity. Your email address is used for sign-in. When live email delivery is configured,
          ErasePaper sends a welcome email after registration and a receipt after a service request is
          submitted; these are not verification messages. No email-verification code, OTP or SMS is sent, and
          the demo sends no emails. We also process profile details, service selections, request titles and
          descriptions, service-specific requirements, status history, messages you send to us and files you
          choose to upload.
        </p>
        <p>
          Administrators may add private operational notes to a request. Security and audit records may
          include account identifiers, request identifiers, action names and timestamps. The application
          stores a salted, one-way password hash—not your readable password. No phone verification code is
          requested or sent.
        </p>
      </Section>
      <Section title="How we use information">
        <p>
          We use this information to authenticate your account, review and respond to service requests,
          communicate about requirements and progress, arrange quotations for printing or delivery, provide
          support, protect accounts and maintain operational records.
        </p>
        <p>
          ErasePaper provides academic guidance, mentoring, editing and documentation support; students remain
          responsible for their own assessed work and submissions.
        </p>
      </Section>
      <Section title="Service providers and storage">
        <p>
          ErasePaper manages email-and-password authentication and server-side sessions. When enabled in the
          live deployment, transactional email is delivered through Resend's HTTPS API using a sending domain
          configured by the operator. Welcome messages contain the account name; request receipts contain the
          request ID and service name; an operational alert sent to ErasePaper support contains the student's
          username, email address, request ID and service name. Resend processes these messages to deliver
          them under its own terms and privacy policy. Student profiles, service requests, notifications and
          application records are stored in MongoDB; the live deployment is intended to use MongoDB Atlas.
          Uploaded files are held in private application storage configured by the operator. The exact
          hosting, storage region and retention settings depend on the deployment selected by ErasePaper.
        </p>
        <p>
          If you choose to contact us through WhatsApp, that conversation is handled by WhatsApp under its own
          terms and privacy policy. ErasePaper does not use advertising pixels or third-party marketing
          trackers. For basic traffic measurement, page views from all visitors—including people who decline
          optional Analytics—are counted as daily, normalized page-category totals with no browser identifier.
          This total cannot identify unique people. Optional detailed analytics is collected only after you
          enable Analytics consent and is stored separately from student profiles and service requests.
          Payment processing is not currently integrated.
        </p>
        <p>
          After Analytics consent, detailed analytics may record random pseudonymous visitor/session
          identifiers, first/last-seen timestamps, daily active dates, coarse device and traffic-source
          categories, and whether a session is anonymous, student or administrator. Identifiers are hashed on
          the server. Raw IP addresses, full user-agent strings, full referrer URLs, query strings and account
          identifiers are not retained in analytics records. Daily page totals are stored separately as a
          date, normalized page category and count, without a visitor/session link; administrators receive
          aggregate reports, not individual visitor browsing histories. Aggregate and linked analytics records
          expire after up to 400 days. Withdrawing consent requests deletion of linked visitor, daily-activity
          and session records; unlinkable daily page totals remain as aggregate counts.
        </p>
      </Section>
      <Section title="Access, correction and deletion requests">
        <p>
          You can review your profile and requests in the student portal. To request access, correction or
          account deletion, contact ErasePaper by email or WhatsApp using the support details above and
          identify the account you are asking about. An administrator can correct account information and run
          the secure account-deletion process.
        </p>
        <p>
          Application deletion removes the profile, related requests, notifications, sign-in sessions and
          uploaded files as cleanup completes. File cleanup may retry after an operational failure. Backups,
          security logs, hosting-provider retention and copies already downloaded may not disappear
          immediately; retention depends on the operator's backup and hosting configuration.
        </p>
      </Section>
      <Section title="Cookies and browser storage">
        <p>
          ErasePaper uses a seven-day HTTP-only authentication cookie with SameSite=Lax; production cookies
          are marked Secure and are not readable by page scripts. The site also stores your cookie-consent
          choice in this browser. A theme preference is saved locally only when Functional preferences are
          enabled. Basic daily page totals use no cookie, localStorage value or visitor identifier. After
          Analytics consent only, this site stores a random visitor identifier in localStorage and a
          tab-scoped analytics session identifier in sessionStorage. They are used for pseudonymous visitor
          counts, are not authentication credentials and are cleared when consent is withdrawn. Demo accounts
          are isolated, in-memory sample accounts and reset when the server restarts.
        </p>
        <p>
          See the <Link to="/cookie-policy">Cookie policy</Link> for details. Authentication credentials are
          not stored in localStorage by this application.
        </p>
      </Section>
      <Section title="Security and retention">
        <p>
          The application uses salted scrypt password hashes, opaque server-side sessions, HTTP-only cookies,
          server-side role checks, input validation, private file downloads and restricted administrator
          access. No internet service can guarantee absolute security. Service-request data follows
          operational retention and deletion workflows; pseudonymous analytics records expire after up to 400
          days. The operator must configure and review retention and backup schedules for the live deployment.
        </p>
      </Section>
      <Section title="Changes to this page">
        <p>
          This policy may be updated when the service or its providers change. The date above identifies the
          latest revision shown by this version of the portal.
        </p>
      </Section>
    </LegalPage>
  );
}

export function CookiePolicy() {
  const { openSettings } = useCookieConsent();
  return (
    <LegalPage
      eyebrow="Privacy choices"
      title="Cookie policy"
      intro="ErasePaper uses essential browser storage to operate the portal and remember your privacy choices. Optional categories stay off until you choose to enable them."
    >
      <Section title="What cookies and browser storage are">
        <p>
          Cookies are small values stored by a website in your browser. Websites can also use similar browser
          storage such as localStorage and sessionStorage. This policy describes both cookies and those
          related storage mechanisms used by ErasePaper.
        </p>
      </Section>
      <Section title="Strictly necessary">
        <p>
          Necessary storage supports core operation, security and the preference choice you make. ErasePaper
          sets a seven-day HTTP-only authentication cookie with SameSite=Lax; production cookies are marked
          Secure. The random session token is stored server-side only as a hash. Demo users use the same
          authentication mechanism against an isolated in-memory store; demo data resets when the server
          restarts.
        </p>
      </Section>
      <Section title="Functional preferences">
        <p>
          Functional storage is optional and can remember interface preferences such as Light, Dark or System
          theme on this device. The selected theme is saved only when you enable Functional preferences.
          Without that consent, a selected theme applies for the current tab but is not retained for a later
          visit.
        </p>
      </Section>
      <Section title="Analytics and marketing">
        <p>
          ErasePaper counts page views from all visitors, including people who turn off optional Analytics.
          This basic total stores only the date, a normalized page category and a count; it uses no browser
          identifier or analytics cookie and cannot identify unique people. Optional detailed analytics is off
          by default and starts only after you enable the Analytics category. It uses random visitor and
          tab-session identifiers, which are hashed by the server, to count consented unique visitors and
          sessions and to group opted-in traffic by coarse device, traffic-source category and
          anonymous/student/admin role. A new tab session starts after 30 minutes without activity. Raw IP
          addresses, full user-agent strings, referrer URLs, query strings and individual visitor journeys are
          not stored or shown to administrators. Analytics records are kept separately from account and
          service-request records for up to 400 days.
        </p>
        <p>
          When Analytics consent is withdrawn, tracking stops and ErasePaper requests deletion of records
          associated with that browser's pseudonymous identifier. Unlinkable daily page-view totals remain as
          aggregate counts. A time-limited revocation record (up to 400 days) prevents already-sent requests
          from recreating linked records. No advertising pixels or third-party marketing trackers are used.
          Accepting the Marketing category does not load a marketing integration.
        </p>
      </Section>
      <Section title="Manage or withdraw your choice">
        <p>
          Use the Cookie settings link in a site footer to review categories, change your selection or
          withdraw optional consent. Your choice is stored in this browser for up to 180 days or until this
          policy version changes. Clearing this site's browser storage also clears the saved choice, so the
          banner may appear again. Preferences do not transfer between browsers or devices.
        </p>
        <button type="button" className="btn-secondary btn-sm mt-2" onClick={openSettings}>
          Open cookie settings <ExternalLink size={13} />
        </button>
      </Section>
      <Section title="Authentication sessions">
        <p>
          ErasePaper manages email-and-password authentication; email addresses are not verified, and the
          welcome/request messages do not prove ownership of an address. Session cookies are HTTP-only and
          SameSite=Lax, expire after seven days and are marked Secure in production. Passwords are stored as
          salted one-way hashes; raw passwords and session tokens are not placed in browser storage readable
          by page scripts. The demo is isolated, in-memory, and sends no transactional email; it should not be
          used with real student information.
        </p>
      </Section>
    </LegalPage>
  );
}

export function TermsAndConditions() {
  return (
    <LegalPage
      eyebrow="Using ErasePaper"
      title="Terms & conditions"
      intro="These terms describe the current ErasePaper academic-support portal. They should be reviewed by the business operator before use with real students; this page is not legal advice."
    >
      <Section title="Services and academic integrity">
        <p>
          ErasePaper offers literature review, research paper and survey paper guidance; bulk printing and
          manual creation; and final-year project mentoring and documentation support. Services are
          assistance, mentoring, editing and documentation—not completing assessed work on a student's behalf.
          Students are responsible for their research, implementation, learning and final submissions.
        </p>
      </Section>
      <Section title="Requests, estimates and delivery">
        <p>
          A submitted request records requirements for review and does not by itself constitute an accepted
          quotation. Manual creation is included without an additional manual-creation fee with the
          bulk-printing service; printing, binding and delivery costs are confirmed separately based on the
          request. No online payment or automated courier integration is currently provided.
        </p>
      </Section>
      <Section title="Accounts and appropriate use">
        <p>
          Keep your contact information accurate and protect your password. Do not share your password, upload
          unlawful or harmful material, attempt to access another person's information, or use the service to
          evade academic rules. Mobile numbers are not verified, and no SMS or verification code is sent.
          Administrators may restrict or remove accounts when needed to protect the service or its users.
        </p>
      </Section>
      <Section title="Requests and account deletion">
        <p>
          Request status is shown in the portal. Students may cancel a Pending request in the application;
          contact support for assistance with other changes. You may ask an administrator to delete your
          account. Deletion removes the local profile, sessions, associated requests and private files;
          operational failures or backups can delay complete removal from every system.
        </p>
      </Section>
      <Section title="Availability and changes">
        <p>
          The portal and its features may change or be temporarily unavailable. ErasePaper does not promise
          grades, publication, acceptance or a particular academic outcome. Contact ErasePaper for current
          scope, availability and pricing before relying on a service.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          Questions about these terms can be emailed to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, sent by{' '}
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          , or discussed by phone at <a href={phoneUrl()}>{formatPhoneNumber()}</a>. The operator should add
          its legal business details and any governing-law or dispute-resolution terms required for its
          jurisdiction before production launch.
        </p>
      </Section>
    </LegalPage>
  );
}
