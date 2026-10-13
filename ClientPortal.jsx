import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clientApi } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import { StatCard, StatusBadge, Empty, formatDate, money } from "@/components/dashParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  LayoutDashboard, Gavel, FileArchive, Receipt, MessageSquare, Bell, CalendarDays,
  Download, Send, Plus, Eye,
} from "lucide-react";

const NAV = [
  { key: "overview", label: "client_dash_overview", icon: LayoutDashboard },
  { key: "cases", label: "my_cases", icon: Gavel },
  { key: "documents", label: "my_documents", icon: FileArchive },
  { key: "invoices", label: "my_invoices", icon: Receipt },
  { key: "messages", label: "my_messages", icon: MessageSquare },
  { key: "notifications", label: "my_notifications", icon: Bell },
  { key: "appointments", label: "my_appointments", icon: CalendarDays },
];

export default function ClientPortal() {
  const { t } = useLang();
  const nav = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(location.state?.user ? { user: location.state.user, client: location.state.client } : null);
  const [activeKey, setActiveKey] = useState("overview");
  const [checking, setChecking] = useState(!me);

  const check = useCallback(async () => {
    if (window.location.hash?.includes("session_id=")) return;
    try {
      const { data } = await clientApi.get("/auth/me");
      setMe(data);
    } catch {
      nav("/client/login");
    } finally {
      setChecking(false);
    }
  }, [nav]);

  useEffect(() => {
    if (!me) check();
    else setChecking(false);
  }, [me, check]);

  const logout = async () => {
    try { await clientApi.post("/auth/logout"); } catch {}
    nav("/client/login");
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">{t("loading")}</div>;
  }
  if (!me?.client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border border-slate-200 rounded-md">
          <CardContent className="p-8 text-center">
            <div className="text-lg font-semibold text-slate-900 mb-2">{me?.user?.name || t("welcome")}</div>
            <p className="text-slate-600 text-sm">
              {t("unauthorized")}. يرجى التواصل مع المكتب لإضافة بريدك ({me?.user?.email}) كموكل.
            </p>
            <Button className="mt-6 w-full bg-slate-900 hover:bg-slate-800" onClick={logout}>{t("signout")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout
      title={t("client_login_title")}
      subtitle={me.client.name}
      nav={NAV}
      activeKey={activeKey}
      onNav={setActiveKey}
      onLogout={logout}
      userLabel={me.user.email}
      testIdPrefix="client"
    >
      {activeKey === "overview" && <ClientOverview />}
      {activeKey === "cases" && <ClientCases />}
      {activeKey === "documents" && <ClientDocs />}
      {activeKey === "invoices" && <ClientInvoices />}
      {activeKey === "messages" && <ClientMessages />}
      {activeKey === "notifications" && <ClientNotifs />}
      {activeKey === "appointments" && <ClientAppts />}
    </DashboardLayout>
  );
}

function ClientOverview() {
  const { t } = useLang();
  const [sum, setSum] = useState(null);
  useEffect(() => { clientApi.get("/client/summary").then((r) => setSum(r.data)).catch(() => {}); }, []);
  return (
    <div className="space-y-6" data-testid="client-overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("stat_cases")} value={sum?.cases_total ?? 0} testid="c-stat-cases" accent />
        <StatCard label={t("stat_open_cases")} value={sum?.open_cases ?? 0} testid="c-stat-open" />
        <StatCard label={t("my_notifications")} value={sum?.unread_notifications ?? 0} testid="c-stat-notifs" />
        <StatCard label={t("my_messages")} value={sum?.unread_messages ?? 0} testid="c-stat-msgs" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("total_fees")}</div>
          <div className="mt-2 font-heading text-2xl font-bold text-slate-900">{money(sum?.total_fees)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("paid_fees")}</div>
          <div className="mt-2 font-heading text-2xl font-bold text-emerald-700">{money(sum?.paid_fees)}</div>
        </div>
        <div className="bg-[#0F172A] rounded-md p-6 text-white">
          <div className="text-xs uppercase tracking-widest text-[#B4975A] font-semibold">{t("remaining_fees")}</div>
          <div className="mt-2 font-heading text-3xl font-bold">{money(sum?.remaining_fees)}</div>
        </div>
      </div>
    </div>
  );
}

function ClientCases() {
  const { t } = useLang();
  const [cases, setCases] = useState([]);
  const [viewing, setViewing] = useState(null);
  useEffect(() => { clientApi.get("/client/cases").then((r) => setCases(r.data)); }, []);
  return (
    <div className="space-y-4" data-testid="client-cases">
      <h2 className="font-heading text-2xl font-bold">{t("my_cases")}</h2>
      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {cases.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("case_title")}</TableHead>
                <TableHead>{t("case_type")}</TableHead>
                <TableHead>{t("case_status")}</TableHead>
                <TableHead>{t("case_next_hearing")}</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.case_id} data-testid={`c-case-${c.case_id}`}>
                    <TableCell className="font-medium">{c.title}
                      {c.case_number && <div className="text-xs text-slate-500" dir="ltr">#{c.case_number}</div>}
                    </TableCell>
                    <TableCell>{c.case_type}</TableCell>
                    <TableCell><StatusBadge status={c.status} label={t(`status_${c.status}`)} /></TableCell>
                    <TableCell className="text-sm">{c.next_hearing ? formatDate(c.next_hearing, true) : "-"}</TableCell>
                    <TableCell className="text-end">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(c)}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && <>
            <DialogHeader><DialogTitle>{viewing.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><b>{t("case_number")}:</b> <span dir="ltr">{viewing.case_number || "-"}</span></div>
                <div><b>{t("case_type")}:</b> {viewing.case_type}</div>
                <div><b>{t("case_court")}:</b> {viewing.court || "-"}</div>
                <div><b>{t("case_status")}:</b> <StatusBadge status={viewing.status} label={t(`status_${viewing.status}`)} /></div>
                <div><b>{t("case_next_hearing")}:</b> {viewing.next_hearing ? formatDate(viewing.next_hearing, true) : "-"}</div>
              </div>
              {viewing.description && <div className="text-sm p-3 bg-slate-50 rounded">{viewing.description}</div>}
              <div>
                <div className="text-sm font-semibold mb-2">{t("case_updates")}</div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {(viewing.updates || []).length === 0 ? <div className="text-slate-400 text-sm">{t("no_data")}</div> :
                    viewing.updates.slice().reverse().map((u, i) => (
                      <div key={i} className="border-s-2 border-[#B4975A] ps-3 py-1">
                        <div className="text-xs text-slate-500">{formatDate(u.date, true)}</div>
                        <div className="text-sm">{u.note}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientDocs() {
  const { t } = useLang();
  const [docs, setDocs] = useState([]);
  useEffect(() => { clientApi.get("/client/documents").then((r) => setDocs(r.data)); }, []);

  const download = (id) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}/download`;
    fetch(url, { credentials: "include" })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const doc = docs.find((d) => d.document_id === id);
        link.download = doc?.filename || "document";
        link.click();
      });
  };

  return (
    <div className="space-y-4" data-testid="client-docs">
      <h2 className="font-heading text-2xl font-bold">{t("my_documents")}</h2>
      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {docs.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("doc_title")}</TableHead>
                <TableHead>{t("inv_desc")}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.document_id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(d.uploaded_at)}</TableCell>
                    <TableCell className="text-end">
                      <Button size="icon" variant="ghost" onClick={() => download(d.document_id)} data-testid={`c-doc-dl-${d.document_id}`}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientInvoices() {
  const { t } = useLang();
  const [invs, setInvs] = useState([]);
  useEffect(() => { clientApi.get("/client/invoices").then((r) => setInvs(r.data)); }, []);
  return (
    <div className="space-y-4" data-testid="client-invoices">
      <h2 className="font-heading text-2xl font-bold">{t("my_invoices")}</h2>
      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {invs.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("inv_desc")}</TableHead>
                <TableHead>{t("inv_amount")}</TableHead>
                <TableHead>{t("inv_paid")}</TableHead>
                <TableHead>{t("remaining_fees")}</TableHead>
                <TableHead>{t("case_status")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invs.map((i) => (
                  <TableRow key={i.invoice_id}>
                    <TableCell className="font-medium">{i.description}</TableCell>
                    <TableCell dir="ltr">{money(i.amount)}</TableCell>
                    <TableCell dir="ltr">{money(i.paid_amount)}</TableCell>
                    <TableCell dir="ltr" className="font-semibold">{money(i.amount - i.paid_amount)}</TableCell>
                    <TableCell><StatusBadge status={i.status} label={t(`inv_status_${i.status}`)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientMessages() {
  const { t } = useLang();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    const { data } = await clientApi.get("/client/messages");
    setMsgs(data);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    await clientApi.post("/client/messages", { content: text });
    setText(""); load();
  };

  return (
    <div className="space-y-4" data-testid="client-messages">
      <h2 className="font-heading text-2xl font-bold">{t("my_messages")}</h2>
      <Card className="border border-slate-200 rounded-md flex flex-col h-[70vh]">
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-2">
          {msgs.length === 0 ? <Empty>{t("no_data")}</Empty> :
            msgs.map((m) => (
              <div key={m.message_id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2 max-w-[75%] text-sm ${m.sender === "client" ? "bubble-lawyer" : "bubble-client"}`}>
                  <div>{m.content}</div>
                  <div className="text-[10px] mt-1 opacity-70">{formatDate(m.created_at, true)}</div>
                </div>
              </div>
            ))
          }
        </CardContent>
        <div className="p-3 border-t border-slate-200 flex gap-2">
          <Input data-testid="c-msg-input" placeholder={t("msg_placeholder")} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send} data-testid="c-msg-send" className="bg-slate-900 hover:bg-slate-800 gap-2">
            <Send className="w-4 h-4" /> {t("send")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ClientNotifs() {
  const { t } = useLang();
  const [notifs, setNotifs] = useState([]);
  useEffect(() => { clientApi.get("/client/notifications").then((r) => setNotifs(r.data)); }, []);
  return (
    <div className="space-y-4" data-testid="client-notifs">
      <h2 className="font-heading text-2xl font-bold">{t("my_notifications")}</h2>
      {notifs.length === 0 ? <Empty>{t("no_data")}</Empty> : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <Card key={n.notification_id} className="border border-slate-200 rounded-md card-lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-heading font-bold text-slate-900">{n.title}</div>
                    <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.body}</div>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{formatDate(n.created_at, true)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientAppts() {
  const { t } = useLang();
  const [appts, setAppts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", purpose: "", notes: "" });

  const load = useCallback(async () => {
    const { data } = await clientApi.get("/client/appointments");
    setAppts(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const book = async () => {
    try {
      if (!form.date || !form.purpose) return toast.error(t("error"));
      await clientApi.post("/client/appointments", form);
      toast.success(t("sent"));
      setOpen(false); setForm({ date: "", purpose: "", notes: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("error")); }
  };

  return (
    <div className="space-y-4" data-testid="client-appts">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{t("my_appointments")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 gap-2" data-testid="c-book-appt-btn">
              <Plus className="w-4 h-4" /> {t("book_appointment")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("book_appointment")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("appt_date")}</Label>
                <Input type="datetime-local" value={form.date} data-testid="c-appt-date" onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("appt_purpose")}</Label>
                <Input value={form.purpose} data-testid="c-appt-purpose" onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("notes")}</Label>
                <Textarea value={form.notes} data-testid="c-appt-notes" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={book} className="bg-slate-900 hover:bg-slate-800" data-testid="c-appt-save">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {appts.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("appt_date")}</TableHead>
                <TableHead>{t("appt_purpose")}</TableHead>
                <TableHead>{t("case_status")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {appts.map((a) => (
                  <TableRow key={a.appointment_id}>
                    <TableCell>{formatDate(a.date, true)}</TableCell>
                    <TableCell className="font-medium">{a.purpose}</TableCell>
                    <TableCell><StatusBadge status={a.status} label={t(`appt_status_${a.status}`)} /></TableCell>
                    <TableCell className="text-sm text-slate-600">{a.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
