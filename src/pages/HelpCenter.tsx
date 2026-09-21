import { useState } from 'react';
import {
  HelpCircle,
  Book,
  Video,
  FileText,
  Download,
  Search,
  ChevronRight,
  Play,
  Mail,
  Phone,
  AlertTriangle,
  ShieldAlert,
  XCircle,
  RefreshCw,
  Lock,
  ServerCrash,
  FileWarning,
  User,
  Building2,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { useRole } from '../contexts/RoleContext';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'manual' | 'video' | 'guide' | 'faq';
  url?: string;
  downloadUrl?: string;
}

interface SupportContact {
  id: string;
  name: string;
  role: string;
  company: 'JPB' | 'KAM';
  email: string;
  phone: string;
  area: string;
  visibleTo: string[];
}

interface TroubleshootingEntry {
  id: string;
  error: string;
  cause: string;
  resolution: string[];
  contact: string;
  icon: React.ElementType;
}

const resources: Resource[] = [
  {
    id: '1',
    title: 'Getting Started Guide',
    description: 'Learn the basics of navigating and using the SMAP platform',
    type: 'guide',
    downloadUrl: '#',
  },
  {
    id: '2',
    title: 'Dashboard Overview Tutorial',
    description: 'Video walkthrough of the main dashboard features',
    type: 'video',
    url: '#',
  },
  {
    id: '3',
    title: 'MO-DSS User Manual',
    description: 'Complete documentation for the Multi-Objective Decision Support System',
    type: 'manual',
    downloadUrl: '#',
  },
  {
    id: '4',
    title: 'Digital Twin Configuration',
    description: 'How to configure and customize your digital twin modules',
    type: 'guide',
    downloadUrl: '#',
  },
  {
    id: '5',
    title: 'Simulation Tutorial',
    description: 'Step-by-step guide to running value chain simulations',
    type: 'video',
    url: '#',
  },
  {
    id: '6',
    title: 'Alert Management Guide',
    description: 'Understanding and managing system alerts effectively',
    type: 'manual',
    downloadUrl: '#',
  },
];

const supportContacts: SupportContact[] = [
  {
    id: 'c1',
    name: 'Thomas Richter',
    role: 'Technical Lead',
    company: 'JPB',
    email: 't.richter@jpb-digital.de',
    phone: '+49 30 1234 5001',
    area: 'Platform architecture, API integrations, system health',
    visibleTo: ['engineer', 'developer', 'admin', 'superuser'],
  },
  {
    id: 'c2',
    name: 'Anna Becker',
    role: 'Project Manager',
    company: 'JPB',
    email: 'a.becker@jpb-digital.de',
    phone: '+49 30 1234 5002',
    area: 'Project coordination, feature requests, roadmap planning',
    visibleTo: ['manager', 'admin', 'superuser'],
  },
  {
    id: 'c3',
    name: 'Markus Weber',
    role: 'Operations Support',
    company: 'JPB',
    email: 'm.weber@jpb-digital.de',
    phone: '+49 30 1234 5003',
    area: 'Day-to-day operations, alert management, operator workflows',
    visibleTo: ['operator', 'manager', 'engineer', 'admin', 'superuser'],
  },
  {
    id: 'c4',
    name: 'Laura Hoffmann',
    role: 'Data Science Lead',
    company: 'KAM',
    email: 'l.hoffmann@kam-analytics.de',
    phone: '+49 89 9876 4001',
    area: 'Simulation models, MO-DSS optimization, digital twin analytics',
    visibleTo: ['engineer', 'developer', 'manager', 'admin', 'superuser'],
  },
  {
    id: 'c5',
    name: 'Stefan Braun',
    role: 'Integration Engineer',
    company: 'KAM',
    email: 's.braun@kam-analytics.de',
    phone: '+49 89 9876 4002',
    area: 'Data pipelines, CDT configuration, export and reporting',
    visibleTo: ['engineer', 'developer', 'admin', 'superuser'],
  },
  {
    id: 'c6',
    name: 'Katrin Schulz',
    role: 'Customer Success Manager',
    company: 'KAM',
    email: 'k.schulz@kam-analytics.de',
    phone: '+49 89 9876 4003',
    area: 'Onboarding, training, user feedback, general inquiries',
    visibleTo: ['operator', 'manager', 'engineer', 'developer', 'admin', 'superuser'],
  },
];

const troubleshootingEntries: TroubleshootingEntry[] = [
  {
    id: 't1',
    error: 'API request failed (500 Internal Server Error)',
    cause: 'The backend service may be temporarily unavailable or experiencing high load.',
    resolution: [
      'Wait 30 seconds and retry the operation.',
      'Check the System Health page for any ongoing incidents.',
      'If the error persists for more than 5 minutes, clear your browser cache and try again.',
    ],
    contact: 'Thomas Richter (JPB) - t.richter@jpb-digital.de',
    icon: ServerCrash,
  },
  {
    id: 't2',
    error: 'Data not loaded - Dashboard widgets show empty state',
    cause: 'Data ingestion pipeline may be delayed, or the selected time range contains no data.',
    resolution: [
      'Verify the selected date range includes recent data.',
      'Refresh the page using the browser reload button.',
      'Check if other dashboards are displaying data correctly.',
      'Review the data source connection status under System Health.',
    ],
    contact: 'Stefan Braun (KAM) - s.braun@kam-analytics.de',
    icon: FileWarning,
  },
  {
    id: 't3',
    error: 'Session expired - Please log in again',
    cause: 'Your authentication token has expired after a period of inactivity.',
    resolution: [
      'Click the "Log in again" button to re-authenticate.',
      'If you are frequently logged out, check that your browser allows cookies.',
      'Ensure your system clock is synchronized correctly.',
    ],
    contact: 'Markus Weber (JPB) - m.weber@jpb-digital.de',
    icon: RefreshCw,
  },
  {
    id: 't4',
    error: 'Permission denied - Insufficient privileges',
    cause: 'Your current role does not have access to the requested feature or resource.',
    resolution: [
      'Verify your current role in the role selector at the top of the page.',
      'Contact your administrator to request the appropriate role assignment.',
      'Review the role permissions table in the User Manual for details.',
    ],
    contact: 'Anna Becker (JPB) - a.becker@jpb-digital.de',
    icon: Lock,
  },
  {
    id: 't5',
    error: 'Simulation failed - Unable to compute results',
    cause: 'The simulation parameters may be invalid, or the computation engine encountered an unexpected state.',
    resolution: [
      'Review the input parameters for any out-of-range values.',
      'Reduce the number of simultaneous objectives or constraints.',
      'Try running the simulation with default parameters first.',
      'Check the simulation logs for detailed error messages.',
    ],
    contact: 'Laura Hoffmann (KAM) - l.hoffmann@kam-analytics.de',
    icon: AlertTriangle,
  },
  {
    id: 't6',
    error: 'Export failed - Report could not be generated',
    cause: 'The dataset may be too large, or the export format is incompatible with the selected data.',
    resolution: [
      'Reduce the date range or number of data points in the report.',
      'Try a different export format (CSV instead of PDF, or vice versa).',
      'Ensure you have sufficient permissions to export reports.',
      'If exporting charts, verify that all visualizations have loaded completely.',
    ],
    contact: 'Stefan Braun (KAM) - s.braun@kam-analytics.de',
    icon: XCircle,
  },
];

const faqs = [
  {
    id: '1',
    question: 'How do I create a new simulation scenario?',
    answer: 'Navigate to Decision Support > Value Chain Simulator, then click "New Scenario" to start the setup wizard.',
  },
  {
    id: '2',
    question: 'What do the different alert severity levels mean?',
    answer: 'Critical alerts require immediate attention, Warning alerts indicate potential issues, and Info alerts are for general notifications.',
  },
  {
    id: '3',
    question: 'How can I export my reports?',
    answer: 'Use the Export button in the top-right corner of any report view, or access the Quick Actions menu for export options.',
  },
  {
    id: '4',
    question: 'How do I change my dashboard layout?',
    answer: 'Click the customize button on the dashboard to enable drag-and-drop mode, then rearrange widgets as needed.',
  },
];

const helpIconSections = [
  { label: 'MO-DSS Objective Weights', path: '/decision-support/modss' },
  { label: 'Simulation Parameters', path: '/decision-support/simulator' },
  { label: 'KPI Threshold Configuration', path: '/kpi-management' },
  { label: 'Digital Twin Module Settings', path: '/digital-twin' },
  { label: 'Alert Rule Definitions', path: '/alerts' },
  { label: 'Role Permissions Overview', path: '/admin/roles' },
];

export default function HelpCenter() {
  const { role } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'resources' | 'faq' | 'troubleshooting' | 'contact'>('resources');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [expandedTroubleshooting, setExpandedTroubleshooting] = useState<string | null>(null);

  const typeConfig = {
    manual: { icon: Book, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Manual' },
    video: { icon: Video, color: 'text-red-600', bg: 'bg-red-50', label: 'Video' },
    guide: { icon: FileText, color: 'text-green-600', bg: 'bg-green-50', label: 'Guide' },
    faq: { icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'FAQ' },
  };

  const filteredResources = resources.filter(
    r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaqs = faqs.filter(
    f =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = supportContacts.filter(c => c.visibleTo.includes(role));

  const filteredTroubleshooting = troubleshootingEntries.filter(
    entry =>
      entry.error.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.cause.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabLabels: Record<string, string> = {
    resources: 'Resources',
    faq: 'FAQ',
    troubleshooting: 'Troubleshooting',
    contact: 'Contact Support',
  };

  return (
    <div className="min-h-screen">
      <Header title="Help Center" subtitle="Resources, tutorials, and support" />

      <div className="p-4 lg:p-6 space-y-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 lg:p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">How can we help you?</h2>
          <p className="text-primary-100 mb-6">
            Search our resources or browse categories below
          </p>

          <div className="relative max-w-xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg text-surface-900 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b border-surface-200 overflow-x-auto">
          {(['resources', 'faq', 'troubleshooting', 'contact'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-surface-600 hover:text-surface-900'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => {
              const config = typeConfig[resource.type];
              const Icon = config.icon;

              return (
                <div
                  key={resource.id}
                  className="bg-white rounded-xl shadow-card p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      <h3 className="font-semibold text-surface-900 mt-1">{resource.title}</h3>
                      <p className="text-sm text-surface-600 mt-1">{resource.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100">
                    {resource.type === 'video' ? (
                      <a
                        href={resource.url}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Play className="w-4 h-4" />
                        Watch Video
                      </a>
                    ) : (
                      <a
                        href={resource.downloadUrl}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="bg-white rounded-xl shadow-card divide-y divide-surface-100">
            {filteredFaqs.map(faq => (
              <div key={faq.id} className="p-4">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-medium text-surface-900">{faq.question}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-surface-400 transition-transform ${
                      expandedFaq === faq.id ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedFaq === faq.id && (
                  <p className="mt-3 text-surface-600 text-sm pl-0">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'troubleshooting' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Before contacting support</p>
                <p className="text-sm text-amber-700 mt-1">
                  Review the common errors below. Most issues can be resolved by following the step-by-step instructions. If the problem persists after trying all resolution steps, contact the listed support person.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card divide-y divide-surface-100">
              {filteredTroubleshooting.map(entry => {
                const EntryIcon = entry.icon;
                return (
                  <div key={entry.id} className="p-4">
                    <button
                      onClick={() =>
                        setExpandedTroubleshooting(
                          expandedTroubleshooting === entry.id ? null : entry.id
                        )
                      }
                      className="w-full flex items-center justify-between text-left gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-red-50 shrink-0">
                          <EntryIcon className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="font-medium text-surface-900 text-sm">{entry.error}</span>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-surface-400 transition-transform shrink-0 ${
                          expandedTroubleshooting === entry.id ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {expandedTroubleshooting === entry.id && (
                      <div className="mt-4 ml-11 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-1">
                            Possible Cause
                          </p>
                          <p className="text-sm text-surface-700">{entry.cause}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2">
                            Resolution Steps
                          </p>
                          <ol className="space-y-1.5">
                            {entry.resolution.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="bg-surface-50 rounded-lg p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-1">
                            Still not resolved? Contact:
                          </p>
                          <p className="text-sm text-primary-600 font-medium">{entry.contact}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 mb-1">Your Support Contacts</h3>
              <p className="text-sm text-surface-500 mb-4">
                Contacts shown are based on your current role ({role}). Reach out to the person responsible for your area of concern.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="bg-white rounded-xl shadow-card p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${contact.company === 'JPB' ? 'bg-primary-50' : 'bg-teal-50'}`}>
                        <User className={`w-5 h-5 ${contact.company === 'JPB' ? 'text-primary-600' : 'text-teal-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-surface-900">{contact.name}</h4>
                        <p className="text-sm text-surface-500">{contact.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-surface-400 shrink-0" />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${contact.company === 'JPB' ? 'bg-primary-50 text-primary-700' : 'bg-teal-50 text-teal-700'}`}>
                        {contact.company}
                      </span>
                    </div>

                    <p className="text-xs text-surface-500 mb-3">{contact.area}</p>

                    <div className="border-t border-surface-100 pt-3 space-y-1.5">
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Phone className="w-4 h-4 shrink-0" />
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="bg-white rounded-xl shadow-card p-6">
                <h3 className="text-lg font-semibold text-surface-900 mb-4">Send a Message</h3>
                <p className="text-surface-600 mb-6">
                  Can't find what you're looking for? Our support team is here to help.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      placeholder="Describe your issue in detail..."
                    />
                  </div>

                  <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                    <Mail className="w-4 h-4" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary-800 mb-1">Context-Sensitive Help</p>
                  <p className="text-sm text-primary-700 mb-3">
                    Look for the <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold align-middle mx-0.5">?</span> help icons throughout the platform. These icons appear in complex sections and provide immediate, contextual guidance without leaving the page.
                  </p>
                  <p className="text-xs font-medium text-primary-600 mb-2">Sections with contextual help:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {helpIconSections.map(section => (
                      <li key={section.path} className="flex items-center gap-2 text-sm text-primary-700">
                        <HelpCircle className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        {section.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
