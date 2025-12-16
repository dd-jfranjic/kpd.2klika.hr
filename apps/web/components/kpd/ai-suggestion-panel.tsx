'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle, Info, Copy, Check, Clock, Calendar, ArrowUpCircle, Timer } from 'lucide-react';
import Link from 'next/link';

// Koristi Next.js API route za KPD search (duži timeout - 120s)
const KPD_SEARCH_API = '/api/kpd/search';

interface KpdSuggestion {
  code: string;
  name: string;
  confidence: number;
  description?: string;
  reason?: string;
  level: number;
  categoryId: string;
  isFinal: boolean;
}

interface AiSuggestionPanelProps {
  onQueryComplete?: (remainingQueries: number) => void;
  initialRemainingQueries?: number;
  monthlyLimit?: number;
  planName?: string;
  isLoading?: boolean;
}

// Helper to get next month reset date
function getNextMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

// Helper to format date in Croatian
function formatDateCroatian(date: Date): string {
  const months = [
    'siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja',
    'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenog', 'prosinca'
  ];
  return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}.`;
}

// Helper to format response time
function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

export function AiSuggestionPanel({
  onQueryComplete,
  initialRemainingQueries,
  monthlyLimit = 5,
  planName = 'Besplatni',
  isLoading = false
}: AiSuggestionPanelProps) {
  const { token } = useAuth();
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [suggestions, setSuggestions] = useState<KpdSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [remainingQueries, setRemainingQueries] = useState<number | null>(initialRemainingQueries ?? null);
  const [lastQueryLatency, setLastQueryLatency] = useState<number | null>(null);
  const [queryWasCached, setQueryWasCached] = useState<boolean>(false);

  // Sync remainingQueries with prop when it changes (e.g., after data loads)
  useEffect(() => {
    if (initialRemainingQueries !== undefined && initialRemainingQueries !== null) {
      setRemainingQueries(initialRemainingQueries);
    }
  }, [initialRemainingQueries]);

  const getSuggestions = async () => {
    if (!itemName.trim() || itemName.length < 2) {
      setError('Naziv artikla mora imati barem 2 znaka');
      return;
    }

    if (!token) {
      setError('Prijava potrebna za AI klasifikaciju. Molimo prijavite se.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);
    setLastQueryLatency(null);
    setQueryWasCached(false);

    try {
      // Combine itemName and itemDescription for the query
      let query = itemName.trim();
      if (itemDescription.trim()) {
        query += ` - ${itemDescription.trim()}`;
      }

      // Add timeout - 120 seconds max (AI thinking mode treba više vremena)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(KPD_SEARCH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          setError('Previše zahtjeva. Molimo pričekajte minutu prije ponovnog pokušaja. Upit vam nije oduzet.');
          return;
        }
        if (response.status === 503) {
          setError('AI servis trenutno nije dostupan. Pokušajte ponovno za nekoliko minuta. Upit vam nije oduzet.');
          return;
        }
        if (response.status === 401) {
          setError('Sesija je istekla. Molimo prijavite se ponovo.');
          return;
        }
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || 'Mjesečni limit upita dosegnut. Nadogradite plan za više upita.');
          return;
        }
        if (response.status === 500 || response.status === 502 || response.status === 504) {
          setError('Došlo je do greške na serveru. Pokušajte ponovo. Upit vam nije oduzet.');
          return;
        }
        throw new Error('Greška pri dohvaćanju prijedloga');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSuggestions(data.data.suggestions || []);
        setRemainingQueries(data.data.remainingQueries);

        // Capture performance metrics
        if (typeof data.data.latencyMs === 'number') {
          setLastQueryLatency(data.data.latencyMs);
        }
        if (typeof data.data.cached === 'boolean') {
          setQueryWasCached(data.data.cached);
        }

        // Notify parent about remaining queries update
        if (onQueryComplete && typeof data.data.remainingQueries === 'number') {
          onQueryComplete(data.data.remainingQueries);
        }

        if (!data.data.suggestions?.length) {
          setError('AI nije pronašao prikladne KPD šifre za ovaj artikl. Pokušajte s detaljnijim opisom. Upit vam nije oduzet jer nije bilo rezultata.');
        }
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
      // Check if it was a timeout/abort error
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Zahtjev je trajao predugo. Pokušajte ponovo s kraćim opisom. Upit vam nije oduzet.');
      } else if (err instanceof TypeError && err.message.includes('network')) {
        setError('Problem s mrežnom vezom. Provjerite internet i pokušajte ponovo. Upit vam nije oduzet.');
      } else {
        setError('Greška pri komunikaciji s AI servisom. Pokušajte ponovo. Upit vam nije oduzet.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Visoka';
    if (confidence >= 0.7) return 'Srednja';
    return 'Niska';
  };

  return (
    <Card className="border-primary-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-t-lg px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-primary-700 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="leading-tight">AI Prijedlog KPD Klasifikacije</span>
          </CardTitle>
          {remainingQueries !== null && (
            <div className="text-xs sm:text-sm text-primary-600 bg-white/70 px-2 py-1 rounded-lg">
              {remainingQueries} upita preostalo
            </div>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Unesite naziv proizvoda ili usluge i neka AI predloži odgovarajuću KPD šifru
        </CardDescription>
      </CardHeader>

      <CardContent className="px-3 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
        {/* Input Form */}
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="itemName" className="text-xs sm:text-sm font-medium text-gray-700">
              Naziv stavke <span className="text-red-500">*</span>
            </label>
            <Input
              id="itemName"
              placeholder="npr. Web development, Laptop, Građevinski radovi..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && getSuggestions()}
              className="text-sm sm:text-base h-10 sm:h-11"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="itemDescription" className="text-xs sm:text-sm font-medium text-gray-700">
              Dodatni opis <span className="text-gray-400">(opcionalno)</span>
            </label>
            <textarea
              id="itemDescription"
              placeholder="Opišite detaljnije za preciznije rezultate..."
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <Button
            onClick={getSuggestions}
            disabled={loading || isLoading || !itemName.trim() || itemName.length < 2 || !token || (!isLoading && remainingQueries !== null && remainingQueries <= 0)}
            className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span className="truncate">AI analizira...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Predloži KPD šifru</span>
              </>
            )}
          </Button>

          {/* Login prompt */}
          {!token && (
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-700">
                <p className="font-medium">Prijava potrebna</p>
                <p>Prijavite se za korištenje AI klasifikacije.</p>
              </div>
            </div>
          )}

          {/* Out of Queries Warning - Only show after loading is complete */}
          {token && !isLoading && remainingQueries !== null && remainingQueries <= 0 && (
            <div className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      Iskoristili ste sve upite za ovaj mjesec
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Vaš <span className="font-semibold text-primary-600">{planName}</span> plan
                      uključuje <span className="font-semibold">{monthlyLimit}</span> upita mjesečno.
                    </p>
                  </div>

                  {/* Reset Date Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-white/70 rounded-lg px-3 py-2 w-fit">
                    <Calendar className="h-4 w-4 text-primary-500" />
                    <span>
                      Nova kvota dostupna od <span className="font-semibold text-primary-600">{formatDateCroatian(getNextMonthReset())}</span>
                    </span>
                  </div>

                  {/* Upgrade CTA */}
                  {planName !== 'Enterprise' && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-2">
                        Trebate više upita? Nadogradite na viši plan i dobijte do 2000 upita mjesečno.
                      </p>
                      <Link href="/settings/billing">
                        <Button className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold shadow-md hover:shadow-lg transition-all">
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          Nadogradi plan
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {/* Results Header with Latency */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Pronađeno {suggestions.length} prijedlog{suggestions.length > 1 ? 'a' : ''}:
              </div>

              {/* Response Time Badge */}
              {lastQueryLatency !== null && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full border border-primary-200">
                    <Timer className="h-3 w-3" />
                    <span className="font-medium">{formatResponseTime(lastQueryLatency)}</span>
                  </div>
                  {queryWasCached && (
                    <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
                      <Clock className="h-3 w-3" />
                      <span>Cache</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.code}
                  className="p-3 sm:p-4 bg-white border border-primary-100 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
                >
                  {/* Mobile: Stack layout, Desktop: Side by side */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Code and Category */}
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2">
                        <span className="bg-primary-500 text-white font-mono text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded">
                          {suggestion.code}
                        </span>
                        {suggestion.categoryId && (
                          <span className="text-primary-600 border border-primary-300 text-xs px-1.5 sm:px-2 py-0.5 rounded">
                            Sektor {suggestion.categoryId}
                          </span>
                        )}
                        {suggestion.isFinal && (
                          <span className="text-green-700 bg-green-100 text-xs px-1.5 sm:px-2 py-0.5 rounded">
                            Finalna
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base leading-tight">
                        {suggestion.name}
                      </h4>

                      {/* Reason */}
                      {suggestion.reason && (
                        <p className="text-xs sm:text-sm text-gray-600 italic line-clamp-2 sm:line-clamp-none">
                          "{suggestion.reason}"
                        </p>
                      )}
                    </div>

                    {/* Confidence & Copy */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-primary-100 sm:shrink-0">
                      {/* Confidence */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs text-gray-500 hidden sm:inline">
                          {getConfidenceLabel(suggestion.confidence)}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getConfidenceColor(suggestion.confidence)} transition-all`}
                              style={{ width: `${suggestion.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-primary-700">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Copy Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(suggestion.code)}
                        className="text-primary-600 border-primary-300 hover:bg-primary-50 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        {copiedCode === suggestion.code ? (
                          <>
                            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Kopirano</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Kopiraj</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Helpful Tips */}
        <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Savjeti za bolju klasifikaciju:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Budite specifični - "Izrada web aplikacija" umjesto samo "IT usluge"</li>
            <li>• Navedite aspekt djelatnosti - proizvodnja, prodaja, ugradnja, servis...</li>
            <li>• Koristite dodatni opis za kompleksnije proizvode/usluge</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
