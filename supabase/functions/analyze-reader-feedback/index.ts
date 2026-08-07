import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackItem {
  feedback: string;
  decision: string;
  recommendation: boolean | null;
  page_abandoned: number | null;
  stop_reason: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { feedback_items, screenplay_id, version_id } = await req.json();

    if (!feedback_items || !Array.isArray(feedback_items) || feedback_items.length === 0) {
      return new Response(
        JSON.stringify({ themes: [], summaries: [], overall_summary: "No reader feedback available yet." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Categorize feedback into themes using keyword matching
    const themeKeywords: Record<string, string[]> = {
      opening: ["opening", "begin", "start", "first page", "first act", "inciting", "setup"],
      dialogue: ["dialogue", "conversation", "speech", "voice", "talking", "monologue", "lines"],
      characters: ["character", "protagonist", "antagonist", "arc", "development", "motivation", "relatable", "sympathetic"],
      pacing: ["pacing", "slow", "fast", "rushed", "drags", "momentum", "speed", "rhythm"],
      structure: ["structure", "plot", "story", "narrative", "act", "turn", "climax", "resolution", "storyline"],
      formatting: ["format", "formatting", "slugline", "action line", "parenthetical", "font", "margin", "page count"],
      ending: ["ending", "conclusion", "finale", "climax", "resolve", "payoff", "final", "twist"],
      general: [],
    };

    const themes: Record<string, string[]> = {};
    for (const key of Object.keys(themeKeywords)) {
      themes[key] = [];
    }

    for (const item of feedback_items as FeedbackItem[]) {
      const text = (item.feedback || "").toLowerCase();
      let matched = false;
      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.length > 0 && keywords.some((kw) => text.includes(kw))) {
          themes[theme].push(item.feedback);
          matched = true;
        }
      }
      if (!matched) {
        themes.general.push(item.feedback);
      }
    }

    // Generate AI-style summaries for each theme
    const themeResults: Array<{
      theme_name: string;
      ai_summary: string;
      comment_count: number;
      sentiment_score: number;
    }> = [];

    for (const [theme, comments] of Object.entries(themes)) {
      if (comments.length === 0) continue;

      // Simple sentiment analysis based on positive/negative word frequency
      const positiveWords = ["good", "great", "excellent", "strong", "compelling", "engaging", "well", "effective", "powerful", "brilliant", "love", "best", "captivating"];
      const negativeWords = ["bad", "weak", "poor", "confusing", "boring", "slow", "unclear", "flat", "cliché", "predictable", "problem", "issue", "unclear", "convoluted"];
      let positive = 0;
      let negative = 0;
      for (const c of comments) {
        const lower = c.toLowerCase();
        positive += positiveWords.filter((w) => lower.includes(w)).length;
        negative += negativeWords.filter((w) => lower.includes(w)).length;
      }
      const sentiment = comments.length > 0 ? (positive - negative) / comments.length : 0;

      // Generate summary by extracting key phrases
      const summary = generateThemeSummary(theme, comments);

      themeResults.push({
        theme_name: theme,
        ai_summary: summary,
        comment_count: comments.length,
        sentiment_score: Math.round(sentiment * 100) / 100,
      });

      // Upsert into comment_themes
      if (version_id) {
        await supabase
          .from("comment_themes")
          .upsert({
            screenplay_version_id: version_id,
            theme_name: theme,
            ai_summary: summary,
            comment_count: comments.length,
            sentiment_score: Math.round(sentiment * 100) / 100,
            computed_at: new Date().toISOString(),
          }, { onConflict: "screenplay_version_id,theme_name" });
      }
    }

    // Generate overall summary
    const totalComments = feedback_items.length;
    const completedCount = (feedback_items as FeedbackItem[]).filter((f) => f.decision === "finished").length;
    const abandonedCount = (feedback_items as FeedbackItem[]).filter((f) => f.decision === "stopped").length;

    const overallSummary = `Based on ${totalComments} reader feedback ${totalComments === 1 ? "item" : "items"} (${completedCount} completed, ${abandonedCount} abandoned), readers most frequently discussed ${themeResults
      .sort((a, b) => b.comment_count - a.comment_count)
      .slice(0, 3)
      .map((t) => t.theme_name)
      .join(", ")}. ${themeResults.length > 3 ? "Other themes were also noted." : ""} This summary is derived from reader feedback and does not represent a quality judgment.`;

    // Generate AI summaries by type
    const summaries: Array<{ summary_type: string; summary_text: string }> = [];

    // Overall
    summaries.push({ summary_type: "overall", summary_text: overallSummary });

    // Themes
    const themesSummary = themeResults
      .sort((a, b) => b.comment_count - a.comment_count)
      .map((t) => `${t.theme_name} (${t.comment_count} mentions): ${t.ai_summary}`)
      .join(" ");
    summaries.push({ summary_type: "themes", summary_text: themesSummary || "No specific themes identified yet." });

    // Pacing
    const pacingTheme = themeResults.find((t) => t.theme_name === "pacing");
    summaries.push({
      summary_type: "pacing",
      summary_text: pacingTheme?.ai_summary || "No specific pacing feedback was provided by readers.",
    });

    // Dialogue
    const dialogueTheme = themeResults.find((t) => t.theme_name === "dialogue");
    summaries.push({
      summary_type: "dialogue",
      summary_text: dialogueTheme?.ai_summary || "No specific dialogue feedback was provided by readers.",
    });

    // Exposition
    const expositionComments = (feedback_items as FeedbackItem[])
      .filter((f) => /exposition|info.?dump|telling|explaining|backstory/i.test(f.feedback))
      .map((f) => f.feedback);
    summaries.push({
      summary_type: "exposition",
      summary_text: expositionComments.length > 0
        ? `${expositionComments.length} reader(s) flagged potential exposition-heavy sections. ${expositionComments[0].slice(0, 200)}...`
        : "No readers flagged exposition-heavy sections.",
    });

    // Formatting
    const formattingTheme = themeResults.find((t) => t.theme_name === "formatting");
    summaries.push({
      summary_type: "formatting",
      summary_text: formattingTheme?.ai_summary || "No formatting issues were flagged by readers.",
    });

    // Genre consistency
    summaries.push({
      summary_type: "genre_consistency",
      summary_text: `Genre consistency analysis is derived from reader feedback patterns. ${themeResults.length} themes were identified across ${totalComments} feedback items.`,
    });

    // Revision suggestions
    const suggestions: string[] = [];
    if (pacingTheme) suggestions.push("Review pacing notes from readers.");
    if (dialogueTheme) suggestions.push("Consider reader feedback on dialogue.");
    if (expositionComments.length > 0) suggestions.push("Address exposition concerns raised by readers.");
    if (themeResults.find((t) => t.theme_name === "characters")) suggestions.push("Examine character development feedback.");
    if (themeResults.find((t) => t.theme_name === "structure")) suggestions.push("Review structural notes from readers.");
    summaries.push({
      summary_type: "revision_suggestions",
      summary_text: suggestions.length > 0
        ? `Based on reader feedback, consider: ${suggestions.join(" ")}`
        : "No specific revision suggestions from reader feedback at this time.",
    });

    // Upsert AI summaries
    if (version_id) {
      for (const s of summaries) {
        await supabase
          .from("ai_summaries")
          .upsert({
            screenplay_version_id: version_id,
            summary_type: s.summary_type,
            summary_text: s.summary_text,
            derived_label: "Derived from reader feedback — not a quality judgment.",
            computed_at: new Date().toISOString(),
          }, { onConflict: "screenplay_version_id,summary_type" });
      }
    }

    return new Response(
      JSON.stringify({
        themes: themeResults,
        summaries,
        overall_summary: overallSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function generateThemeSummary(theme: string, comments: string[]): string {
  if (comments.length === 0) return "";
  const count = comments.length;
  const excerpts = comments.slice(0, 3).map((c) => {
    const clean = c.replace(/\s+/g, " ").trim();
    return clean.length > 150 ? clean.slice(0, 150) + "..." : clean;
  });

  const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);
  return `${count} reader(s) discussed ${themeLabel.toLowerCase()}. Key points: ${excerpts.join(" | ")}`;
}
