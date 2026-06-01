"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function LegalModal({ isOpen, onClose, title, children }: LegalModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 prose prose-slate max-w-none">
                {children}
              </div>
              <div className="p-6 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={onClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function TermsOfService() {
  return (
    <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
      <div>
        <p className="text-xs text-slate-500 mb-4">Last Updated: May 18, 2026</p>
        <p>
          Welcome to our School Administration Platform. By accessing or using our services, you agree to be bound by these Terms of Service. Please read them carefully.
        </p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h3>
        <p>
          By creating an account and using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">2. Description of Service</h3>
        <p>
          Our platform provides comprehensive school administration tools including but not limited to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Organization and school management</li>
          <li>Branch administration and oversight</li>
          <li>Student and staff data management</li>
          <li>Analytics and reporting tools</li>
          <li>Communication and collaboration features</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">3. User Accounts</h3>
        <p className="mb-2">
          <strong>Account Creation:</strong> You must provide accurate, complete, and current information during the registration process. You are responsible for maintaining the confidentiality of your account credentials.
        </p>
        <p className="mb-2">
          <strong>Account Security:</strong> You are responsible for all activities that occur under your account. Notify us immediately of any unauthorized use of your account.
        </p>
        <p>
          <strong>Account Types:</strong> Different account types (Organization Owner, Administrator, Staff) have different access levels and responsibilities as defined in our platform documentation.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">4. User Responsibilities</h3>
        <p>You agree to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Use the service only for lawful purposes and in accordance with these Terms</li>
          <li>Not use the service in any way that could damage, disable, or impair the service</li>
          <li>Not attempt to gain unauthorized access to any part of the service</li>
          <li>Maintain the accuracy of information you provide to us</li>
          <li>Comply with all applicable laws and regulations regarding data protection and privacy</li>
          <li>Respect the intellectual property rights of others</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">5. Data Protection and Privacy</h3>
        <p>
          We take data protection seriously, especially when it comes to educational institutions and student information. Our handling of your data is governed by our Privacy Policy, which complies with applicable data protection regulations including GDPR, FERPA, and other relevant educational data protection laws.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">6. Intellectual Property</h3>
        <p className="mb-2">
          <strong>Our Content:</strong> All content, features, and functionality of the service, including but not limited to text, graphics, logos, and software, are owned by us or our licensors and are protected by copyright, trademark, and other intellectual property laws.
        </p>
        <p>
          <strong>Your Content:</strong> You retain ownership of any content you upload to the platform. By uploading content, you grant us a license to use, store, and display that content as necessary to provide the service.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">7. Payment and Billing</h3>
        <p>
          If you subscribe to a paid plan, you agree to pay all fees associated with your subscription. Fees are billed in advance on a recurring basis. We reserve the right to change our pricing with 30 days&rsquo; notice.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">8. Service Availability</h3>
        <p>
          While we strive to provide uninterrupted service, we do not guarantee that the service will be available at all times. We may suspend or terminate the service for maintenance, updates, or other reasons with or without notice.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">9. Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">10. Termination</h3>
        <p>
          We reserve the right to suspend or terminate your account and access to the service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">11. Changes to Terms</h3>
        <p>
          We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the platform. Your continued use of the service after such modifications constitutes your acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">12. Governing Law</h3>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which your organization operates, without regard to its conflict of law provisions.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">13. Contact Information</h3>
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <div className="mt-2 p-4 bg-slate-100 rounded-lg">
          <p className="font-medium">School Administration Platform</p>
          <p>Email: legal@schooladmin.com</p>
          <p>Support: support@schooladmin.com</p>
        </div>
      </section>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
      <div>
        <p className="text-xs text-slate-500 mb-4">Last Updated: May 18, 2026</p>
        <p>
          This Privacy Policy describes how we collect, use, and protect your personal information when you use our School Administration Platform. We are committed to protecting your privacy and ensuring the security of your data.
        </p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Information We Collect</h3>

        <h4 className="font-semibold text-slate-800 mt-4 mb-2">Personal Information</h4>
        <p>When you create an account, we collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Name (including father&rsquo;s name and grandfather&rsquo;s name)</li>
          <li>Email address</li>
          <li>Phone number (optional)</li>
          <li>Physical address (optional)</li>
          <li>Organization details</li>
        </ul>

        <h4 className="font-semibold text-slate-800 mt-4 mb-2">Educational Data</h4>
        <p>Through your use of the platform, we may collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>School and branch information</li>
          <li>Student records and academic data</li>
          <li>Staff information and credentials</li>
          <li>Performance metrics and analytics</li>
        </ul>

        <h4 className="font-semibold text-slate-800 mt-4 mb-2">Technical Information</h4>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>IP address and device information</li>
          <li>Browser type and version</li>
          <li>Usage data and analytics</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">2. How We Use Your Information</h3>
        <p>We use the collected information to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Provide and maintain our services</li>
          <li>Process your transactions and manage your account</li>
          <li>Send you important updates and notifications</li>
          <li>Improve our platform and develop new features</li>
          <li>Ensure security and prevent fraud</li>
          <li>Comply with legal obligations</li>
          <li>Provide customer support</li>
          <li>Generate analytics and insights (anonymized)</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">3. Data Protection and Security</h3>
        <p className="mb-2">
          We implement industry-standard security measures to protect your data:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>End-to-end encryption for sensitive data</li>
          <li>Secure data centers with 24/7 monitoring</li>
          <li>Regular security audits and penetration testing</li>
          <li>Access controls and authentication mechanisms</li>
          <li>Regular backups and disaster recovery procedures</li>
          <li>Employee training on data protection</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">4. Data Sharing and Disclosure</h3>
        <p className="mb-2">
          We do not sell your personal information. We may share your data only in the following circumstances:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>With your consent:</strong> When you explicitly authorize us to share information</li>
          <li><strong>Service providers:</strong> Third-party vendors who help us operate our platform (under strict confidentiality agreements)</li>
          <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">5. Educational Data Protection</h3>
        <p>
          We recognize the sensitive nature of educational data and comply with relevant regulations including:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>FERPA:</strong> Family Educational Rights and Privacy Act (US)</li>
          <li><strong>GDPR:</strong> General Data Protection Regulation (EU)</li>
          <li><strong>COPPA:</strong> Children&rsquo;s Online Privacy Protection Act</li>
          <li>Other applicable local and international data protection laws</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">6. Your Rights</h3>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
          <li><strong>Erasure:</strong> Request deletion of your data (subject to legal obligations)</li>
          <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
          <li><strong>Objection:</strong> Object to certain types of data processing</li>
          <li><strong>Restriction:</strong> Request limitation of data processing</li>
          <li><strong>Withdraw consent:</strong> Withdraw previously given consent at any time</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">7. Data Retention</h3>
        <p>
          We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. When data is no longer needed, we securely delete or anonymize it.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">8. Cookies and Tracking</h3>
        <p className="mb-2">
          We use cookies and similar technologies to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Remember your preferences and settings</li>
          <li>Analyze platform usage and performance</li>
          <li>Provide personalized content</li>
          <li>Ensure security and prevent fraud</li>
        </ul>
        <p className="mt-2">
          You can control cookie settings through your browser preferences.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">9. International Data Transfers</h3>
        <p>
          Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">10. Children&rsquo;s Privacy</h3>
        <p>
          While our platform is used by educational institutions that serve minors, we do not knowingly collect personal information directly from children under 13 without parental consent. Schools and parents are responsible for managing student data in compliance with applicable laws.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">11. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. We encourage you to review this policy periodically.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">12. Contact Us</h3>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
        </p>
        <div className="mt-2 p-4 bg-slate-100 rounded-lg">
          <p className="font-medium">Data Protection Officer</p>
          <p>School Administration Platform</p>
          <p>Email: privacy@schooladmin.com</p>
          <p>Support: support@schooladmin.com</p>
        </div>
      </section>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Your Privacy Matters</h4>
        <p className="text-blue-800 text-sm">
          We are committed to protecting your privacy and maintaining the security of your data. If you have any concerns or questions about how we handle your information, please don&apos;t hesitate to reach out to our team.
        </p>
      </section>
    </div>
  );
}
