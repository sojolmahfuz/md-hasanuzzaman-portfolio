/* =========================================================
   Supabase Client & Data Connector
   Project ID: vxxoomirrwmfzepiyuis
   API Key: sb_publishable_hqiY9qxz7ZwHiEM6qTEfRA_5N4VwfeN
   ========================================================= */

(() => {
  "use strict";

  const SUPABASE_URL = "https://vxxoomirrwmfzepiyuis.supabase.co";
  const SUPABASE_KEY = "sb_publishable_hqiY9qxz7ZwHiEM6qTEfRA_5N4VwfeN";

  let client = null;
  if (window.supabase && typeof window.supabase.createClient === "function") {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  window.CUB_SUPABASE = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    client: client,

    // Test connection
    async testConnection() {
      if (!client) return { ok: false, error: "Supabase JS SDK not loaded" };
      try {
        const { data, error } = await client.from("site_content").select("id").limit(1);
        if (error) {
          if (error.code === "PGRST205" || error.message.includes("does not exist") || error.message.includes("schema cache")) {
            return { ok: true, tablesPending: true, message: "Connected to Supabase! (Database tables need to be created via SQL Editor)" };
          }
          return { ok: false, error: error.message };
        }
        return { ok: true, tablesPending: false, message: "Connected to Supabase and tables are verified active!" };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    // Fetch site content
    async fetchContent() {
      if (!client) return null;
      try {
        const { data, error } = await client
          .from("site_content")
          .select("data")
          .eq("id", "main")
          .maybeSingle();

        if (error) {
          console.warn("[Supabase] Content fetch notice:", error.message);
          return null;
        }
        return data?.data || null;
      } catch (e) {
        console.warn("[Supabase] Content fetch exception:", e.message);
        return null;
      }
    },

    // Save site content (used by Admin)
    async saveContent(contentData) {
      if (!client) throw new Error("Supabase SDK not initialized");
      const { data, error } = await client
        .from("site_content")
        .upsert({
          id: "main",
          data: contentData,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" })
        .select();

      if (error) throw error;
      return data;
    },

    // Send contact form message
    async sendMessage({ name, email, subject, message }) {
      if (!client) return { ok: false, error: "Supabase not loaded" };
      try {
        const { data, error } = await client
          .from("inbox_messages")
          .insert([{ name, email, subject, message }]);

        if (error) {
          console.warn("[Supabase] Send message notice:", error.message);
          return { ok: false, error: error.message };
        }
        return { ok: true, data };
      } catch (e) {
        console.warn("[Supabase] Send message exception:", e.message);
        return { ok: false, error: e.message };
      }
    },

    // Get messages for Admin Inbox
    async fetchMessages() {
      if (!client) return [];
      try {
        const { data, error } = await client
          .from("inbox_messages")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("[Supabase] Fetch messages notice:", error.message);
          return [];
        }
        return data || [];
      } catch (e) {
        return [];
      }
    },

    // Delete message from Admin Inbox
    async deleteMessage(id) {
      if (!client) return false;
      const { error } = await client.from("inbox_messages").delete().eq("id", id);
      return !error;
    },

    // Mark message as read
    async markMessageRead(id) {
      if (!client) return false;
      const { error } = await client.from("inbox_messages").update({ read: true }).eq("id", id);
      return !error;
    }
  };
})();
