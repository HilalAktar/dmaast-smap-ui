import { useState, useMemo, useRef } from 'react';
import {
  Search,
  BookOpen,
  Plus,
  X,
  Save,
  Tag,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  Edit3,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Header from '../components/layout/Header';
import HelpPopover from '../components/shared/HelpPopover';
import Tooltip from '../components/shared/Tooltip';
import { useRole } from '../contexts/RoleContext';

type TermCategory = 'General' | 'Technical' | 'Business' | 'Module-specific';
type ReviewStatus = 'approved' | 'pending-review' | 'draft';

interface Term {
  id: string;
  name: string;
  definition: string;
  category: TermCategory;
  relatedModule: string;
  lastUpdated: string;
  reviewStatus: ReviewStatus;
  lastReviewedBy?: string;
}

const reviewStatusConfig: Record<ReviewStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  'approved': { label: 'Approved', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  'pending-review': { label: 'Pending Review', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  'draft': { label: 'Draft', bg: 'bg-surface-100', text: 'text-surface-600', icon: Edit3 },
};

const initialTerms: Term[] = [
  { id: 't-01', name: 'Scenario', definition: 'A configurable set of parameters and conditions used to model a specific operational situation within the simulation engine. Scenarios allow users to test hypothetical changes before applying them to production.', category: 'General', relatedModule: 'Decision Support', lastUpdated: '2025-12-10', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-02', name: 'Alert', definition: 'A system-generated notification triggered when a monitored metric exceeds predefined thresholds. Alerts are classified by severity (critical, warning, info) and routed to the appropriate stakeholders for acknowledgment.', category: 'General', relatedModule: 'Alert Center', lastUpdated: '2025-11-28', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-03', name: 'Optimization Target', definition: 'A quantifiable objective that the MO-DDSS seeks to maximize or minimize, such as cost reduction, throughput increase, or carbon footprint minimization. Multiple optimization targets can be balanced simultaneously using Pareto analysis.', category: 'Business', relatedModule: 'MO-DDSS', lastUpdated: '2025-12-05', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-04', name: 'KPI', definition: 'Key Performance Indicator. A measurable value that demonstrates how effectively the organization is achieving its operational and strategic objectives. KPIs are tracked in real time across all digital twin modules.', category: 'Business', relatedModule: 'Dashboard', lastUpdated: '2025-12-12', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-05', name: 'Digital Twin', definition: 'A virtual representation of a physical asset, process, or system that is continuously updated with real-time data. Digital twins enable monitoring, analysis, and simulation without disrupting actual operations.', category: 'Technical', relatedModule: 'Digital Twin', lastUpdated: '2025-12-01', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-06', name: 'Cognitive Digital Twin (CDT)', definition: 'An advanced digital twin augmented with AI and machine learning capabilities. CDTs can autonomously detect anomalies, predict failures, and recommend corrective actions based on learned patterns from historical and real-time data.', category: 'Technical', relatedModule: 'Digital Twin', lastUpdated: '2025-12-08', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-07', name: 'MO-DDSS', definition: 'Multi-Objective Data-Driven Decision Support System. An analytical framework that evaluates trade-offs between competing objectives using optimization algorithms, providing decision-makers with ranked alternatives and impact assessments.', category: 'Technical', relatedModule: 'Decision Support', lastUpdated: '2025-11-30', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-08', name: 'HITL', definition: 'Human-in-the-Loop. A design paradigm where human operators are integrated into automated decision workflows, allowing them to review, validate, override, or approve system-generated recommendations before execution.', category: 'General', relatedModule: 'Decision Support', lastUpdated: '2025-12-03', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-09', name: 'SCA', definition: 'Supply Chain Analytics. The application of data analysis and modeling techniques to understand supply chain dynamics, identify risks, optimize inventory levels, and improve supplier performance across the value chain.', category: 'Business', relatedModule: 'Value Chain DT', lastUpdated: '2025-12-06', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-10', name: 'LCSA', definition: 'Life Cycle Sustainability Assessment. A comprehensive evaluation framework that assesses the environmental, social, and economic impacts of a product or process throughout its entire life cycle, from raw material extraction to end-of-life.', category: 'Technical', relatedModule: 'Sustainability DT', lastUpdated: '2025-11-25', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-11', name: 'PLCA', definition: 'Process Life Cycle Assessment. A methodology for quantifying the environmental impacts associated with all stages of a manufacturing process, including energy consumption, emissions, resource depletion, and waste generation.', category: 'Technical', relatedModule: 'Sustainability DT', lastUpdated: '2025-12-02', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-12', name: 'Pareto Front', definition: 'The set of all non-dominated solutions in a multi-objective optimization problem. Each point on the Pareto front represents an optimal trade-off where no objective can be improved without worsening another. Used in MO-DDSS to visualize decision trade-offs.', category: 'Technical', relatedModule: 'MO-DDSS', lastUpdated: '2025-12-09', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-13', name: 'Value Chain', definition: 'The complete sequence of activities involved in creating, producing, delivering, and supporting a product. In the SMAP context, the value chain encompasses suppliers, manufacturing, logistics, and end-customer delivery as an integrated system.', category: 'Business', relatedModule: 'Value Chain DT', lastUpdated: '2025-11-20', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-14', name: 'Simulation', definition: 'The computational process of modeling a real-world system over time to evaluate its behavior under various conditions. Simulations in SMAP run on digital twin data and allow stakeholders to assess what-if scenarios without operational risk.', category: 'General', relatedModule: 'Decision Support', lastUpdated: '2025-12-11', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
  { id: 't-15', name: 'Scorecard', definition: 'A structured performance report that aggregates multiple KPIs into a consolidated view. Scorecards provide a balanced assessment of operational, financial, and sustainability metrics, enabling quick evaluation of overall system health.', category: 'Business', relatedModule: 'Dashboard', lastUpdated: '2025-12-07', reviewStatus: 'approved', lastReviewedBy: 'Admin' },
];

const categories: TermCategory[] = ['General', 'Technical', 'Business', 'Module-specific'];

const categoryStyles: Record<TermCategory, { bg: string; text: string; border: string }> = {
  General: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Technical: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Business: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Module-specific': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function TerminologyDictionary() {
  const { role } = useRole();
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'All'>('All');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<ReviewStatus | 'All'>('All');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Term, 'id' | 'lastUpdated' | 'reviewStatus' | 'lastReviewedBy'>>({
    name: '', definition: '', category: 'General', relatedModule: '',
  });
  const [newTerm, setNewTerm] = useState<Omit<Term, 'id' | 'lastUpdated' | 'reviewStatus' | 'lastReviewedBy'>>({
    name: '',
    definition: '',
    category: 'General',
    relatedModule: '',
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const canManageTerms = role === 'admin' || role === 'superuser';

  const checkDuplicate = (name: string, excludeId?: string): string | null => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return null;
    const match = terms.find(
      t => t.id !== excludeId && t.name.toLowerCase() === normalized
    );
    if (match) return `Exact duplicate: "${match.name}" already exists.`;
    const similar = terms.find(
      t => t.id !== excludeId && (
        t.name.toLowerCase().includes(normalized) ||
        normalized.includes(t.name.toLowerCase())
      ) && t.name.toLowerCase() !== normalized
    );
    if (similar) return `Similar term found: "${similar.name}". Please verify this is not a duplicate.`;
    return null;
  };

  const filteredTerms = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return terms
      .filter((term) => {
        const matchesSearch =
          term.name.toLowerCase().includes(query) ||
          term.definition.toLowerCase().includes(query) ||
          term.relatedModule.toLowerCase().includes(query);
        const matchesCategory =
          selectedCategory === 'All' || term.category === selectedCategory;
        const matchesReview =
          selectedReviewStatus === 'All' || term.reviewStatus === selectedReviewStatus;
        return matchesSearch && matchesCategory && matchesReview;
      })
      .sort((a, b) =>
        sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
  }, [terms, searchQuery, selectedCategory, selectedReviewStatus, sortAsc]);

  const availableLetters = useMemo(() => {
    const letters = new Set(filteredTerms.map((term) => term.name[0].toUpperCase()));
    return letters;
  }, [filteredTerms]);

  const handleScrollToLetter = (letter: string) => {
    const target = document.getElementById(`term-letter-${letter}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddTerm = () => {
    if (!newTerm.name.trim() || !newTerm.definition.trim()) return;

    const exact = terms.find(t => t.name.toLowerCase() === newTerm.name.trim().toLowerCase());
    if (exact) {
      setDuplicateWarning(`Cannot add: "${exact.name}" already exists.`);
      return;
    }

    const term: Term = {
      id: `t-${Date.now()}`,
      name: newTerm.name.trim(),
      definition: newTerm.definition.trim(),
      category: newTerm.category,
      relatedModule: newTerm.relatedModule.trim(),
      lastUpdated: new Date().toISOString().split('T')[0],
      reviewStatus: 'pending-review',
    };

    setTerms((prev) => [...prev, term]);
    setNewTerm({ name: '', definition: '', category: 'General', relatedModule: '' });
    setDuplicateWarning(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (term: Term) => {
    setEditingTermId(term.id);
    setEditForm({
      name: term.name,
      definition: term.definition,
      category: term.category,
      relatedModule: term.relatedModule,
    });
    setDuplicateWarning(null);
  };

  const handleSaveEdit = () => {
    if (!editingTermId || !editForm.name.trim() || !editForm.definition.trim()) return;

    const exact = terms.find(
      t => t.id !== editingTermId && t.name.toLowerCase() === editForm.name.trim().toLowerCase()
    );
    if (exact) {
      setDuplicateWarning(`Cannot rename: "${exact.name}" already exists.`);
      return;
    }

    setTerms(prev => prev.map(t =>
      t.id === editingTermId
        ? {
            ...t,
            name: editForm.name.trim(),
            definition: editForm.definition.trim(),
            category: editForm.category,
            relatedModule: editForm.relatedModule.trim(),
            lastUpdated: new Date().toISOString().split('T')[0],
            reviewStatus: 'pending-review' as ReviewStatus,
          }
        : t
    ));
    setEditingTermId(null);
    setDuplicateWarning(null);
  };

  const handleApprove = (id: string) => {
    setTerms(prev => prev.map(t =>
      t.id === id ? { ...t, reviewStatus: 'approved' as ReviewStatus, lastReviewedBy: role } : t
    ));
  };

  const groupedTerms = useMemo(() => {
    const groups: Record<string, Term[]> = {};
    filteredTerms.forEach((term) => {
      const letter = term.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    });
    return groups;
  }, [filteredTerms]);

  const sortedLetters = Object.keys(groupedTerms).sort();

  return (
    <div className="min-h-screen">
      <Header
        title="Terminology Dictionary"
        subtitle="Centralized reference for all platform terms and definitions"
      />

      <div className="p-4 lg:p-6 space-y-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 lg:p-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-7 h-7" />
                <h2 className="text-2xl font-bold">SMAP Terminology</h2>
                <HelpPopover
                  text="Browse, search, and manage all platform terms. Admins can add or edit terms — edits go through a review workflow. Use category and status filters to narrow results. Duplicate detection prevents inconsistent terminology."
                  linkTo="/help"
                  linkLabel="Terminology guide"
                  position="bottom-right"
                />
              </div>
              <p className="text-primary-100 max-w-2xl">
                The authoritative reference for all key UI and domain terms used across
                the SMAP platform. Accessible to all users for consistent understanding
                of concepts, metrics, and system components.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-3 text-primary-100 text-sm">
              <span className="bg-white/20 rounded-lg px-3 py-1.5 font-medium">
                {terms.length} Terms
              </span>
              <span className="bg-white/20 rounded-lg px-3 py-1.5 font-medium">
                {categories.length} Categories
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="hidden lg:block w-14 flex-shrink-0">
            <div className="sticky top-6 bg-white rounded-xl shadow-card py-2">
              <nav aria-label="Alphabetical index">
                {alphabet.map((letter) => {
                  const isAvailable = availableLetters.has(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => handleScrollToLetter(letter)}
                      disabled={!isAvailable}
                      className={`w-full py-0.5 text-xs font-medium transition-colors ${
                        isAvailable
                          ? 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
                          : 'text-surface-300 cursor-default'
                      }`}
                      aria-label={`Jump to letter ${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="bg-white rounded-xl shadow-card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Search terms, definitions, or modules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    aria-label="Search terminology"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-surface-400 hidden sm:block" />
                  <select
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as TermCategory | 'All')
                    }
                    className="text-sm border border-surface-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by category"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedReviewStatus}
                    onChange={(e) =>
                      setSelectedReviewStatus(e.target.value as ReviewStatus | 'All')
                    }
                    className="text-sm border border-surface-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by review status"
                  >
                    <option value="All">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending-review">Pending Review</option>
                    <option value="draft">Draft</option>
                  </select>

                  <Tooltip content={sortAsc ? 'Sort Z to A' : 'Sort A to Z'}>
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-sm border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors text-surface-600"
                      aria-label={sortAsc ? 'Sort Z to A' : 'Sort A to Z'}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      <span className="hidden sm:inline">{sortAsc ? 'A-Z' : 'Z-A'}</span>
                    </button>
                  </Tooltip>

                  {canManageTerms && (
                    <button
                      onClick={() => { setShowAddForm(!showAddForm); setDuplicateWarning(null); }}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        showAddForm
                          ? 'bg-surface-200 text-surface-700'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                      }`}
                    >
                      {showAddForm ? (
                        <>
                          <X className="w-4 h-4" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Term
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {showAddForm && canManageTerms && (
              <div className="bg-white rounded-xl shadow-card p-5 border-l-4 border-primary-500">
                <h3 className="text-lg font-semibold text-surface-900 mb-4">
                  Add New Term
                </h3>
                {duplicateWarning && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg border border-amber-200 bg-amber-50">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-800">{duplicateWarning}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Term Name
                    </label>
                    <input
                      type="text"
                      value={newTerm.name}
                      onChange={(e) => {
                        setNewTerm((prev) => ({ ...prev, name: e.target.value }));
                        setDuplicateWarning(checkDuplicate(e.target.value));
                      }}
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter term name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newTerm.category}
                      onChange={(e) =>
                        setNewTerm((prev) => ({
                          ...prev,
                          category: e.target.value as TermCategory,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Definition
                    </label>
                    <textarea
                      rows={3}
                      value={newTerm.definition}
                      onChange={(e) =>
                        setNewTerm((prev) => ({ ...prev, definition: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      placeholder="Provide a clear, concise definition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Related Module
                    </label>
                    <input
                      type="text"
                      value={newTerm.relatedModule}
                      onChange={(e) =>
                        setNewTerm((prev) => ({
                          ...prev,
                          relatedModule: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Dashboard, Digital Twin"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        setNewTerm({ name: '', definition: '', category: 'General', relatedModule: '' });
                        setDuplicateWarning(null);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear Form
                    </button>
                    <button
                      onClick={handleAddTerm}
                      disabled={!newTerm.name.trim() || !newTerm.definition.trim()}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      Save Term
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={gridRef}>
              {filteredTerms.length === 0 ? (
                <div className="bg-white rounded-xl shadow-card p-12 text-center">
                  <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-surface-400" />
                  </div>
                  <h3 className="text-lg font-medium text-surface-900">
                    No terms found
                  </h3>
                  <p className="text-sm text-surface-500 mt-1">
                    Try adjusting your search query or category filter
                  </p>
                </div>
              ) : (
                sortedLetters.map((letter) => (
                  <div key={letter} id={`term-letter-${letter}`} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-500 text-white font-bold text-lg">
                        {letter}
                      </span>
                      <div className="flex-1 h-px bg-surface-200" />
                      <span className="text-xs text-surface-400 font-medium">
                        {groupedTerms[letter].length}{' '}
                        {groupedTerms[letter].length === 1 ? 'term' : 'terms'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {groupedTerms[letter].map((term) => {
                        const style = categoryStyles[term.category];
                        const rStatus = reviewStatusConfig[term.reviewStatus];
                        const StatusIcon = rStatus.icon;
                        const isEditing = editingTermId === term.id;

                        if (isEditing) {
                          return (
                            <div
                              key={term.id}
                              className="bg-white rounded-xl shadow-card p-5 border-2 border-primary-300"
                            >
                              <h4 className="text-sm font-semibold text-surface-900 mb-3">Edit Term</h4>
                              {duplicateWarning && (
                                <div className="flex items-center gap-2 p-2 mb-3 rounded-lg border border-amber-200 bg-amber-50">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  <span className="text-xs text-amber-800">{duplicateWarning}</span>
                                </div>
                              )}
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => {
                                    setEditForm(prev => ({ ...prev, name: e.target.value }));
                                    setDuplicateWarning(checkDuplicate(e.target.value, term.id));
                                  }}
                                  className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Term name"
                                />
                                <textarea
                                  rows={3}
                                  value={editForm.definition}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, definition: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                  placeholder="Definition"
                                />
                                <select
                                  value={editForm.category}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as TermCategory }))}
                                  className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <input
                                  type="text"
                                  value={editForm.relatedModule}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, relatedModule: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Related module"
                                />
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={!editForm.name.trim() || !editForm.definition.trim()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setEditingTermId(null); setDuplicateWarning(null); }}
                                    className="px-3 py-1.5 text-xs font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-xs text-surface-400">
                                  Edited terms are set to "Pending Review" until approved.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={term.id}
                            className="bg-white rounded-xl shadow-card p-5 hover:shadow-lg transition-shadow border border-surface-100"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-base font-semibold text-surface-900 leading-snug">
                                {term.name}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {canManageTerms && (
                                  <Tooltip content="Edit term">
                                    <button
                                      onClick={() => handleStartEdit(term)}
                                      className="p-1 text-surface-400 hover:text-primary-600 rounded transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </Tooltip>
                                )}
                                <span
                                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${style.bg} ${style.text} ${style.border}`}
                                >
                                  {term.category}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 mb-3">
                              <StatusIcon className={`w-3.5 h-3.5 ${rStatus.text}`} />
                              <span className={`text-xs font-medium ${rStatus.text}`}>{rStatus.label}</span>
                              {canManageTerms && term.reviewStatus === 'pending-review' && (
                                <button
                                  onClick={() => handleApprove(term.id)}
                                  className="ml-auto text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                            </div>

                            <p className="text-sm text-surface-600 leading-relaxed mb-4">
                              {term.definition}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                              <div className="flex items-center gap-1.5 text-xs text-surface-500">
                                <Layers className="w-3.5 h-3.5" />
                                <span>{term.relatedModule}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-surface-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{term.lastUpdated}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredTerms.length > 0 && (
              <div className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between text-sm text-surface-500">
                <span>
                  Showing {filteredTerms.length} of {terms.length} terms
                </span>
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  <span>
                    {selectedCategory === 'All'
                      ? 'All categories'
                      : selectedCategory}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
