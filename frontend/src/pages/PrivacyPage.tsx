import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => (
  <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <Link
        to="/login"
        className="inline-flex items-center gap-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
      >
        <img src="/getsatgo-logo.png" alt="" className="h-8 w-auto object-contain" />
        Back to sign in
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: November 17, 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">About this policy</h2>
          <p className="mt-2">
            GetSATGo provides digital SAT practice for students and teachers. This
            policy describes the information handled when you use GetSATGo and the
            choices available to you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Information we collect
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Account information:</strong> name, email address, account
              role, approval status, and account creation date. When you choose
              Google sign-in, Google provides an ID token that our server verifies;
              GetSATGo uses the verified email address and name to create or access
              your account. We request basic identity, email, and profile sign-in
              scopes, not access to Google Drive or contacts.
            </li>
            <li>
              <strong>Practice information:</strong> mock-test and drill answers,
              correctness, scores, topics, time spent, flagged questions, and
              completion dates. Teachers and administrators may view student
              account and learning-progress information in the teacher tools.
            </li>
            <li>
              <strong>Usage analytics:</strong> Mixpanel receives page-view paths
              and authentication event names, with limited properties such as
              account role or sign-in provider. Automatic capture is disabled;
              GetSATGo does not send passwords, names, email addresses, or practice
              answers to Mixpanel.
            </li>
            <li>
              <strong>Technical information:</strong> our hosting, authentication,
              analytics, and calculator providers may process connection and
              device information needed to deliver and secure their services.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            How we use information
          </h2>
          <p className="mt-2">
            We use account information to authenticate users, manage account
            approval, and provide role-appropriate access. Practice information
            powers score reports, learning dashboards, and teacher progress views.
            Usage analytics help us understand visits and sign-in activity and
            improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Service providers and sharing
          </h2>
          <p className="mt-2">
            GetSATGo uses Google for sign-in, Railway for application and database
            hosting, Mixpanel for product analytics, and Desmos for the embedded
            graphing calculator. These providers process information as needed to
            provide their services and under their own privacy terms. Calculator
            interactions are subject to Desmos&apos; privacy policy. We do not sell
            account or practice information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Storage, security, and retention
          </h2>
          <p className="mt-2">
            Account and practice records are stored in the GetSATGo database hosted
            by Railway. Existing password credentials are stored as salted hashes.
            App session tokens are kept in your browser&apos;s local storage and
            expire after seven days. We use HTTPS for the hosted service and
            reasonable safeguards to protect information, but no online service
            can guarantee absolute security.
          </p>
          <p className="mt-2">
            We retain account and practice records while they are needed to provide
            the service. GetSATGo does not currently offer self-service account
            deletion or an automatic data-retention schedule. Contact us to request
            access, correction, or deletion; we will respond in accordance with
            applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Your choices</h2>
          <p className="mt-2">
            You can stop using Google sign-in and revoke GetSATGo&apos;s access from
            your Google Account settings. To ask a question or make a privacy
            request, contact{' '}
            <a
              href="mailto:contactmadhav.mittal@gmail.com"
              className="font-semibold text-blue-700 underline"
            >
              contactmadhav.mittal@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Changes and contact
          </h2>
          <p className="mt-2">
            We may update this policy as GetSATGo changes. The latest version will
            be available on this page. For questions about this policy, use the
            contact email above.
          </p>
        </section>
      </div>
    </article>
  </main>
);
