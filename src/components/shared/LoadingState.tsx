import type { CSSProperties } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-surface-200 border-t-primary-500 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingSkeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`bg-surface-200 rounded animate-pulse ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-start justify-between mb-4">
        <LoadingSkeleton className="h-4 w-32" />
        <LoadingSkeleton className="h-8 w-8 rounded-lg" />
      </div>
      <LoadingSkeleton className="h-8 w-24 mb-2" />
      <LoadingSkeleton className="h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <LoadingSkeleton className="h-5 w-40 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
          <LoadingSkeleton key={i} className="flex-1" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="p-4 border-b border-surface-100">
        <LoadingSkeleton className="h-5 w-32" />
      </div>
      <div className="divide-y divide-surface-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <LoadingSkeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <LoadingSkeleton className="h-4 w-3/4 mb-2" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
            <LoadingSkeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullPageLoader() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-surface-500">{t('common.loading')}</p>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  errorCode?: string;
  contactEmail?: string;
  contactName?: string;
}

export function ErrorState({ message, onRetry, errorCode, contactEmail = 't.richter@jpb-digital.de', contactName = 'Technical Support (JPB)' }: ErrorStateProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center p-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="max-w-md">
        <p className="text-surface-900 font-medium mb-1">{message || t('common.error')}</p>
        {errorCode && (
          <p className="text-surface-400 text-xs font-mono mb-2">Error: {errorCode}</p>
        )}
        <p className="text-surface-500 text-sm mb-2">
          Please check your connection and try again. If the problem persists, contact support.
        </p>
        <div className="text-xs text-surface-400 bg-surface-50 rounded-lg p-3 mt-2">
          <p className="font-medium text-surface-500 mb-1">Need help? Contact:</p>
          <a href={`mailto:${contactEmail}`} className="text-primary-600 hover:text-primary-700 transition-colors">
            {contactName} ({contactEmail})
          </a>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center p-6">
      <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-surface-500">{message || t('common.noData')}</p>
    </div>
  );
}
