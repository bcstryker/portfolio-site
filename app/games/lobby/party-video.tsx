"use client";

import {useEffect, useState, type MouseEvent} from "react";
import {getSupabase} from "@/lib/supabase";
import {normalizeMeetLink} from "@/lib/meet-link";
import styles from "./lobby.module.css";

export default function PartyVideo({roomId, version, meetUrl, host, onUpdated}: {
  roomId: string; version: number; meetUrl?: string | null; host: boolean; onUpdated: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(meetUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {setDraft(meetUrl ?? ""); setError(""); setNotice("");}, [roomId, meetUrl]);
  const safeUrl = meetUrl ? normalizeMeetLink(meetUrl) : null;
  async function save(remove = false) {
    if (saving) return;
    const url = remove ? null : normalizeMeetLink(draft);
    if (!remove && !url) {setError("Enter a Google Meet link like https://meet.google.com/abc-defg-hij."); return;}
    setSaving(true); setError(""); setNotice("");
    try {
      const {error: saveError} = await getSupabase().rpc("set_party_video", {room_id: roomId, meeting_url: url, expected_version: version});
      if (saveError) throw saveError;
      await onUpdated();
      setNotice(remove ? "Video link removed." : "Video link shared with your party.");
    } catch (cause) {
      const text = cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "Could not save the video link. Please try again.";
      setError(text.includes("schema cache") ? "The video-chat migration needs to be deployed first." : text);
      await onUpdated().catch(() => {});
    } finally {setSaving(false);}
  }
  function openVideo(event: MouseEvent<HTMLAnchorElement>) {
    if (!safeUrl || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const popup = window.open("about:blank", `party-video-${roomId}`, "popup=yes,width=960,height=720,resizable=yes,scrollbars=yes");
    if (popup) {
      popup.opener = null;
      popup.location.replace(safeUrl);
      event.preventDefault();
    }
    // If the browser blocks the popup, retain the normal link's new-tab behavior.
  }
  return <div className={styles.partyVideo}>
    <div className={styles.videoActions}>
      {safeUrl ? <a className={styles.videoLink} href={safeUrl} target="_blank" rel="noopener noreferrer" onClick={openVideo}>Open video chat ↗</a> : <span className={styles.small}>{host ? "Add a Google Meet for your party." : "Your host can add a video chat link."}</span>}
      {host && <details className={styles.videoSettings}>
        <summary>{safeUrl ? "Edit video link" : "Add video chat"}</summary>
        <form onSubmit={(event) => {event.preventDefault(); void save();}}>
          <label>Google Meet link<input type="url" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="https://meet.google.com/abc-defg-hij" maxLength={2048} required /></label>
          <div className={styles.inviteActions}><button disabled={saving} type="submit">{saving ? "Saving…" : "Share with party"}</button>{safeUrl && <button type="button" disabled={saving} onClick={() => void save(true)}>Remove link</button>}</div>
          <p className={styles.small}>Create a call in Google Meet, then paste its link here. It stays with your party between games.</p>
        </form>
      </details>}
    </div>
    {safeUrl && <p className={styles.small}>Opens Google Meet in a separate window or tab.</p>}
    {error && <p className={styles.videoError} role="alert">{error}</p>}
    {notice && <p className={styles.copyNote} role="status">{notice}</p>}
  </div>;
}
