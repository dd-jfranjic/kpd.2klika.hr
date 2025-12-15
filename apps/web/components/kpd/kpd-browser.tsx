'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Loader2,
  FolderTree,
  FileText,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface KpdNode {
  code: string;
  name: string;
  description?: string;
  level: number;
  parentCode?: string;
  isLeaf: boolean;
  children?: KpdNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

interface KpdSection {
  code: string;
  name: string;
  isLoading?: boolean;
  isExpanded?: boolean;
  children?: KpdNode[];
}

export function KpdBrowser() {
  const { token } = useAuth();
  const [sections, setSections] = useState<KpdSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KpdNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load top-level sections on mount
  useEffect(() => {
    loadSections();
  }, [token]);

  const loadSections = async () => {
    setIsLoadingSections(true);
    try {
      const response = await fetch(`${API_BASE}/kpd/categories`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        setSections(
          data.map((s: any) => ({
            code: s.id || s.code, // API returns 'id', map to 'code'
            name: s.name,
            isExpanded: false,
            children: [],
          }))
        );
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setIsLoadingSections(false);
    }
  };

  const loadChildren = async (parentCode: string, isCategory = false) => {
    try {
      // For categories (single letter A-V), use /categories/:id endpoint
      // For codes, use /code/:id/children endpoint
      const isTopLevelCategory = /^[A-V]$/.test(parentCode);
      const endpoint = isTopLevelCategory || isCategory
        ? `${API_BASE}/kpd/categories/${parentCode}`
        : `${API_BASE}/kpd/code/${parentCode}/children`;

      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const json = await response.json();
        // Categories endpoint returns { category, codes }, children endpoint returns array
        const data = json.data?.codes || json.data || json;
        return data.map((child: any) => ({
          code: child.id || child.code,
          name: child.name,
          level: child.level || 1,
          isLeaf: child.isFinal || child.isLeaf || false,
          isExpanded: false,
          children: [],
        }));
      }
    } catch (error) {
      console.error('Error loading children:', error);
    }
    return [];
  };

  const toggleSection = async (sectionCode: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.code === sectionCode) {
          if (!section.isExpanded && section.children?.length === 0) {
            // Load children
            section.isLoading = true;
            loadChildren(sectionCode).then((children) => {
              setSections((s) =>
                s.map((sec) =>
                  sec.code === sectionCode
                    ? { ...sec, children, isLoading: false, isExpanded: true }
                    : sec
                )
              );
            });
            return { ...section, isLoading: true };
          }
          return { ...section, isExpanded: !section.isExpanded };
        }
        return section;
      })
    );
  };

  const toggleNode = async (
    sectionCode: string,
    nodePath: string[],
    nodeCode: string
  ) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.code === sectionCode) {
          const updateNode = (
            nodes: KpdNode[],
            path: string[],
            targetCode: string
          ): KpdNode[] => {
            return nodes.map((node) => {
              if (node.code === targetCode) {
                if (!node.isExpanded && !node.isLeaf && node.children?.length === 0) {
                  // Load children
                  loadChildren(node.code).then((children) => {
                    setSections((s) =>
                      s.map((sec) => {
                        if (sec.code === sectionCode) {
                          const updateNodeWithChildren = (
                            n: KpdNode[],
                            target: string
                          ): KpdNode[] => {
                            return n.map((nd) => {
                              if (nd.code === target) {
                                return {
                                  ...nd,
                                  children,
                                  isLoading: false,
                                  isExpanded: true,
                                };
                              }
                              if (nd.children && nd.children.length > 0) {
                                return {
                                  ...nd,
                                  children: updateNodeWithChildren(nd.children, target),
                                };
                              }
                              return nd;
                            });
                          };
                          return {
                            ...sec,
                            children: updateNodeWithChildren(sec.children || [], targetCode),
                          };
                        }
                        return sec;
                      })
                    );
                  });
                  return { ...node, isLoading: true };
                }
                return { ...node, isExpanded: !node.isExpanded };
              }
              if (node.children && node.children.length > 0) {
                return { ...node, children: updateNode(node.children, path, targetCode) };
              }
              return node;
            });
          };
          return {
            ...section,
            children: updateNode(section.children || [], nodePath, nodeCode),
          };
        }
        return section;
      })
    );
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE}/kpd/search/local?q=${encodeURIComponent(searchQuery)}&limit=20`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (response.ok) {
        const json = await response.json();
        // Backend vraća { success: true, data: [...] }
        const results = json.data || json;
        setSearchResults(results.map((item: any) => ({
          code: item.id || item.code,
          name: item.name,
          description: item.description,
          level: item.level,
          isLeaf: item.isFinal || item.isLeaf || false,
        })));
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, handleSearch]);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderNode = (
    node: KpdNode,
    sectionCode: string,
    path: string[] = [],
    depth = 0
  ) => {
    const isLeaf = node.isLeaf || node.level >= 6;
    const canExpand = !isLeaf;

    return (
      <div key={node.code} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
            depth > 0 ? 'ml-4' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() =>
            canExpand && toggleNode(sectionCode, path, node.code)
          }
        >
          {canExpand ? (
            node.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <FileText className="w-4 h-4 text-primary-500" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-primary-600">
                {node.code}
              </span>
              {isLeaf && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  Finalni kod
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{node.name}</p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(node.code);
            }}
          >
            {copiedCode === node.code ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        {node.isExpanded && node.children && node.children.length > 0 && (
          <div className="border-l border-gray-200 ml-4">
            {node.children.map((child) =>
              renderNode(child, sectionCode, [...path, node.code], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100">
        <CardTitle className="flex items-center gap-2 text-primary-700">
          <FolderTree className="w-5 h-5" />
          KPD Preglednik - Ručna pretraga
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretraži KPD kodove..."
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="rounded-lg p-2 max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <div
                    key={result.code}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-primary-600">
                          {result.code}
                        </span>
                        {result.isLeaf && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Finalni kod
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{result.name}</p>
                      {result.description && (
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => copyToClipboard(result.code)}
                    >
                      {copiedCode === result.code ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Nema rezultata za "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Tree Browser */}
        {searchQuery.length < 2 && (
          <div className="rounded-lg">
            {isLoadingSections ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div>
                {sections.map((section) => (
                  <div key={section.code}>
                    <div
                      className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleSection(section.code)}
                    >
                      {section.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : section.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-mono text-sm font-bold text-primary-600">
                        {section.code}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">
                        {section.name}
                      </span>
                    </div>
                    {section.isExpanded && (
                      <div className="border-l-2 border-primary-200 ml-4 pb-2">
                        {section.children && section.children.length > 0 ? (
                          section.children.map((child) =>
                            renderNode(child, section.code, [section.code], 1)
                          )
                        ) : (
                          <div className="py-3 px-4 text-sm text-gray-500 italic">
                            Ova kategorija nema podkategorija
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
