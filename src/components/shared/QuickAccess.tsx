import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Play,
  Download,
  Bell,
  Settings,
  BarChart3,
  X,
  Star,
  Bookmark,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import Tooltip from './Tooltip';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  permission?: string;
}

interface UserBookmark {
  id: string;
  label: string;
  path: string;
}

const BOOKMARKS_KEY = 'smap-user-bookmarks';
const MAX_BOOKMARKS = 6;

function loadBookmarks(): UserBookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: UserBookmark[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export default function QuickAccess() {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>(loadBookmarks);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useRole();

  const currentPath = location.pathname;
  const currentTitle = document.title || currentPath;

  const isCurrentPageBookmarked = bookmarks.some(
    (b) => b.path === currentPath
  );

  const isAtLimit = bookmarks.length >= MAX_BOOKMARKS;

  const addBookmark = useCallback(() => {
    if (isCurrentPageBookmarked || isAtLimit) return;
    const newBookmark: UserBookmark = {
      id: `bk-${Date.now()}`,
      label: currentTitle,
      path: currentPath,
    };
    const updated = [newBookmark, ...bookmarks];
    setBookmarks(updated);
    saveBookmarks(updated);
  }, [bookmarks, currentPath, currentTitle, isCurrentPageBookmarked, isAtLimit]);

  const removeBookmark = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = bookmarks.filter((b) => b.id !== id);
      setBookmarks(updated);
      saveBookmarks(updated);
    },
    [bookmarks]
  );

  const actions: QuickAction[] = [
    {
      id: 'new-scenario',
      label: 'New Scenario',
      icon: Plus,
      action: () => navigate('/digital-twin/value-chain-sim'),
      permission: 'canRunSimulations',
    },
    {
      id: 'run-simulation',
      label: 'Run Simulation',
      icon: Play,
      action: () => navigate('/digital-twin/manufacturing-sim'),
      permission: 'canRunSimulations',
    },
    {
      id: 'export-report',
      label: 'Export Report',
      icon: Download,
      action: () => {
        setIsOpen(false);
      },
      permission: 'canExportReports',
    },
    {
      id: 'view-alerts',
      label: 'View Alerts',
      icon: Bell,
      action: () => navigate('/alerts'),
    },
    {
      id: 'view-analytics',
      label: 'Analytics',
      icon: BarChart3,
      action: () => navigate('/'),
    },
    {
      id: 'mo-dss',
      label: 'MO-DSS',
      icon: Settings,
      action: () => navigate('/decision-support/mo-dss'),
      permission: 'canAccessMODSS',
    },
  ];

  const visibleActions = actions.filter(
    (action) =>
      !action.permission ||
      hasPermission(action.permission as keyof typeof hasPermission)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white rounded-xl shadow-lg border border-surface-200 py-2 animate-fade-in max-h-[70vh] overflow-y-auto">
          {bookmarks.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">
                My Bookmarks
              </div>
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="group flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                  onClick={() => {
                    navigate(bookmark.path);
                    setIsOpen(false);
                  }}
                >
                  <Star className="w-4 h-4 text-primary-500 shrink-0" />
                  <span className="flex-1 min-w-0 break-words">{bookmark.label}</span>
                  <button
                    onClick={(e) => removeBookmark(bookmark.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface-200"
                    aria-label={`Remove bookmark ${bookmark.label}`}
                  >
                    <X className="w-3.5 h-3.5 text-surface-400" />
                  </button>
                </div>
              ))}
              <div className="my-1 border-t border-surface-200" />
            </>
          )}

          {!isCurrentPageBookmarked && !isAtLimit && (
            <button
              onClick={() => {
                addBookmark();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 hover:bg-surface-50 transition-colors font-medium"
            >
              <Bookmark className="w-4 h-4 text-primary-500" />
              Bookmark This Page
            </button>
          )}

          {isAtLimit && !isCurrentPageBookmarked && (
            <div className="px-4 py-2 text-xs text-surface-400">
              Bookmark limit reached ({MAX_BOOKMARKS}/{MAX_BOOKMARKS}).
              Remove one to add more.
            </div>
          )}

          {isCurrentPageBookmarked && (
            <div className="px-4 py-2 text-xs text-surface-400 flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-primary-400" />
              This page is bookmarked
            </div>
          )}

          {(bookmarks.length > 0 || !isCurrentPageBookmarked || isAtLimit) && (
            <div className="my-1 border-t border-surface-200" />
          )}

          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-surface-500" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      <Tooltip
        content={isOpen ? 'Close menu' : 'Quick actions'}
        position="left"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
            isOpen
              ? 'bg-surface-700 text-white rotate-45'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
          aria-expanded={isOpen}
          aria-label="Quick actions menu"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}
