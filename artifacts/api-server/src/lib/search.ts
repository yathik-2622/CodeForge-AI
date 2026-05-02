import { logger } from "./logger";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  if (TAVILY_API_KEY) {
    return tavilySearch(query, maxResults);
  }
  if (SERPAPI_KEY) {
    return serpSearch(query, maxResults);
  }
  logger.warn("No search API key configured (TAVILY_API_KEY or SERPAPI_KEY)");
  return [{
    title: "Search not configured",
    url: "",
    content: "No search API key is configured. Add TAVILY_API_KEY or SERPAPI_KEY to enable web search.",
  }];
}

async function tavilySearch(query: string, maxResults: number): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
  });
  if (!response.ok) throw new Error(`Tavily error ${response.status}`);
  const data = await response.json() as any;
  return (data.results ?? []).map((r: any) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }));
}

async function serpSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, api_key: SERPAPI_KEY, num: String(maxResults) });
  const response = await fetch(`https://serpapi.com/search?${params}`);
  if (!response.ok) throw new Error(`SerpAPI error ${response.status}`);
  const data = await response.json() as any;
  return (data.organic_results ?? []).slice(0, maxResults).map((r: any) => ({
    title: r.title,
    url: r.link,
    content: r.snippet ?? "",
  }));
}
