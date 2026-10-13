import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { lawyerApi } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import { StatCard, StatusBadge, Empty, formatDate, money } from "@/components/dashParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Gavel, FileArchive, Receipt, MessageSquare, Bell, CalendarDays,
  Plus, Trash2, Edit3, Upload, Download, Send, Eye, Building2, ImagePlus, X,
  BookOpen, FileText, Image as ImageIcon, Video,
} from "lucide-react";

const NAV = [
  { key: "overview", label: "dash_overview", icon: LayoutDashboard },
  { key: "clients", label: "dash_clients", icon: Users },
  { key: "cases", label: "dash_cases", icon: Gavel },
  { key: "documents", label: "dash_documents", icon: FileArchive },
  { key: "invoices", label: "dash_invoices", icon: Receipt },
  { key: "messages", label: "dash_messages", icon: MessageSquare },
  { key: "notifications", label: "dash_notifications", icon: Bell },
  { key: "appointments", label: "dash_appointments", icon: CalendarDays },
  { key: "properties", label: "properties_title", icon: Building2 },
  { key: "articles", label: "articles_title", icon: BookOpen },
];

// Context used by all sections to decide whether to show write actions
const RoleContext = React.createContext({ role: "owner", readOnly: false });
const useRole = () => React.useContext(RoleContext);

export default function LawyerDashboard() {
  const { t } = useLang();
  const nav = useNavigate();
  const [activeKey, setActiveKey] = useState("overview");
  const [me, setMe] = useState(null);
  const [clients, setClients] = useState([]);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await lawyerApi.get("/lawyer/me");
      setMe(data);
    } catch {
      nav("/lawyer/login");
    }
  }, [nav]);

  const loadClients = useCallback(async () => {
    try {
      const { data } = await lawyerApi.get("/clients");
      setClients(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("lawyer_token")) {
      nav("/lawyer/login");
      return;
    }
    loadMe();
    loadClients();
  }, [loadMe, loadClients, nav]);

  const logout = () => {
    localStorage.removeItem("lawyer_token");
    localStorage.removeItem("lawyer_name");
    localStorage.removeItem("lawyer_role");
    nav("/lawyer/login");
  };

  const role = me?.role || "owner";
  const readOnly = role === "partner";

  return (
    <RoleContext.Provider value={{ role, readOnly }}>
    <DashboardLayout
      title={t("hero_kicker")}
      subtitle={me?.name || t("hero_title")}
      nav={NAV}
      activeKey={activeKey}
      onNav={setActiveKey}
      onLogout={logout}
      userLabel={me?.email}
      testIdPrefix="lawyer"
    >
      {readOnly && (
        <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded text-sm font-medium" data-testid="read-only-banner">
          <Eye className="w-4 h-4" />
          <span>{t("role_partner")} · {t("view_only")}</span>
        </div>
      )}
      {activeKey === "overview" && <OverviewSection />}
      {activeKey === "clients" && (
        <ClientsSection clients={clients} reload={loadClients} />
      )}
      {activeKey === "cases" && <CasesSection clients={clients} />}
      {activeKey === "documents" && <DocumentsSection clients={clients} />}
      {activeKey === "invoices" && <InvoicesSection clients={clients} />}
      {activeKey === "messages" && <MessagesSection clients={clients} />}
      {activeKey === "notifications" && <NotificationsSection clients={clients} />}
      {activeKey === "appointments" && <AppointmentsSection clients={clients} />}
      {activeKey === "properties" && <PropertiesSection />}
      {activeKey === "articles" && <ArticlesSection />}
    </DashboardLayout>
    </RoleContext.Provider>
  );
}

// ============= OVERVIEW =============
function OverviewSection() {
  const { t } = useLang();
  const [sum, setSum] = useState(null);
  useEffect(() => {
    lawyerApi.get("/lawyer/summary").then((r) => setSum(r.data)).catch(() => {});
  }, []);
  return (
    <div className="space-y-6" data-testid="overview-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("stat_clients")} value={sum?.clients ?? 0} testid="stat-clients" accent />
        <StatCard label={t("stat_open_cases")} value={sum?.open_cases ?? 0} testid="stat-open-cases" />
        <StatCard label={t("stat_pending_appts")} value={sum?.pending_appointments ?? 0} testid="stat-pending" />
        <StatCard label={t("stat_outstanding")} value={money(sum?.outstanding)} testid="stat-outstanding" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("stat_billed")}</div>
          <div className="mt-2 font-heading text-2xl font-bold text-slate-900">{money(sum?.total_billed)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("stat_collected")}</div>
          <div className="mt-2 font-heading text-2xl font-bold text-emerald-700">{money(sum?.total_collected)}</div>
        </div>
      </div>
    </div>
  );
}

// ============= CLIENTS =============
function ClientsSection({ clients, reload }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", address: "", notes: "" });
    setOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await lawyerApi.patch(`/clients/${editing.client_id}`, form);
      else await lawyerApi.post("/clients", form);
      toast.success(t("saved"));
      setOpen(false);
      reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await lawyerApi.delete(`/clients/${id}`);
    toast.success(t("deleted"));
    reload();
  };

  return (
    <div className="space-y-4" data-testid="clients-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{t("dash_clients")}</h2>
        {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="add-client-btn" className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" /> {t("add_client")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="client-dialog">
            <DialogHeader>
              <DialogTitle>{editing ? t("edit") : t("add_client")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Field label={t("name")}>
                <Input data-testid="client-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label={t("email")}>
                <Input data-testid="client-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label={t("phone")}>
                <Input data-testid="client-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label={t("address")}>
                <Input data-testid="client-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label={t("notes")}>
                <Textarea data-testid="client-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={save} data-testid="client-save-btn" className="bg-slate-900 hover:bg-slate-800">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <Empty>{t("no_data")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.client_id} data-testid={`client-row-${c.client_id}`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell dir="ltr" className="text-sm text-slate-600">{c.email}</TableCell>
                    <TableCell dir="ltr" className="text-sm text-slate-600">{c.phone || "-"}</TableCell>
                    <TableCell className="text-end">
                      {!readOnly && (<>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`client-edit-${c.client_id}`}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del(c.client_id)} data-testid={`client-del-${c.client_id}`} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </>)}
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

// ============= CASES =============
function CasesSection({ clients }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [cases, setCases] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const emptyForm = {
    client_id: "", title: "", case_number: "", description: "",
    case_type: "مدني", status: "open", court: "", next_hearing: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [updateNote, setUpdateNote] = useState("");

  const load = useCallback(async () => {
    const { data } = await lawyerApi.get("/cases");
    setCases(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      client_id: c.client_id, title: c.title, case_number: c.case_number || "",
      description: c.description || "", case_type: c.case_type || "مدني",
      status: c.status, court: c.court || "", next_hearing: c.next_hearing || "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await lawyerApi.patch(`/cases/${editing.case_id}`, form);
      else await lawyerApi.post("/cases", form);
      toast.success(t("saved"));
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await lawyerApi.delete(`/cases/${id}`);
    load();
  };
  const addUpdate = async () => {
    if (!updateNote.trim()) return;
    const { data } = await lawyerApi.post(`/cases/${viewing.case_id}/updates`, { note: updateNote });
    setViewing(data);
    setUpdateNote("");
    load();
    toast.success(t("sent"));
  };

  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "-";

  const statuses = ["open", "in_progress", "court", "closed", "won", "lost"];

  return (
    <div className="space-y-4" data-testid="cases-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{t("dash_cases")}</h2>
        {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="add-case-btn" className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" /> {t("add_case")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="case-dialog">
            <DialogHeader>
              <DialogTitle>{editing ? t("edit") : t("add_case")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <Field label={t("dash_clients")}>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger data-testid="case-client-select"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("case_title")}>
                <Input data-testid="case-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("case_number")}>
                  <Input data-testid="case-number" value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} />
                </Field>
                <Field label={t("case_type")}>
                  <Input data-testid="case-type" value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("case_court")}>
                  <Input data-testid="case-court" value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} />
                </Field>
                <Field label={t("case_status")}>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="case-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{t(`status_${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t("case_next_hearing")}>
                <Input data-testid="case-next-hearing" type="datetime-local" value={form.next_hearing || ""} onChange={(e) => setForm({ ...form, next_hearing: e.target.value })} />
              </Field>
              <Field label={t("case_description")}>
                <Textarea rows={4} data-testid="case-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={save} data-testid="case-save-btn" className="bg-slate-900 hover:bg-slate-800">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {cases.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("case_title")}</TableHead>
                  <TableHead>{t("dash_clients")}</TableHead>
                  <TableHead>{t("case_status")}</TableHead>
                  <TableHead>{t("case_next_hearing")}</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.case_id} data-testid={`case-row-${c.case_id}`}>
                    <TableCell className="font-medium">
                      {c.title}
                      {c.case_number && <div className="text-xs text-slate-500" dir="ltr">#{c.case_number}</div>}
                    </TableCell>
                    <TableCell>{clientName(c.client_id)}</TableCell>
                    <TableCell><StatusBadge status={c.status} label={t(`status_${c.status}`)} /></TableCell>
                    <TableCell className="text-sm">{c.next_hearing ? formatDate(c.next_hearing, true) : "-"}</TableCell>
                    <TableCell className="text-end">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(c)} data-testid={`case-view-${c.case_id}`}><Eye className="w-4 h-4" /></Button>
                      {!readOnly && (<>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`case-edit-${c.case_id}`}><Edit3 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(c.case_id)} className="text-red-600" data-testid={`case-del-${c.case_id}`}><Trash2 className="w-4 h-4" /></Button>
                      </>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Case viewer */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl" data-testid="case-view-dialog">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><b>{t("dash_clients")}:</b> {clientName(viewing.client_id)}</div>
                  <div><b>{t("case_number")}:</b> <span dir="ltr">{viewing.case_number || "-"}</span></div>
                  <div><b>{t("case_type")}:</b> {viewing.case_type}</div>
                  <div><b>{t("case_court")}:</b> {viewing.court || "-"}</div>
                  <div><b>{t("case_status")}:</b> <StatusBadge status={viewing.status} label={t(`status_${viewing.status}`)} /></div>
                  <div><b>{t("case_next_hearing")}:</b> {viewing.next_hearing ? formatDate(viewing.next_hearing, true) : "-"}</div>
                </div>
                {viewing.description && (
                  <div className="text-sm p-3 bg-slate-50 rounded">{viewing.description}</div>
                )}
                <div>
                  <div className="text-sm font-semibold mb-2">{t("case_updates")}</div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {(viewing.updates || []).length === 0 ? (
                      <div className="text-slate-400 text-sm">{t("no_data")}</div>
                    ) : (
                      viewing.updates.slice().reverse().map((u, i) => (
                        <div key={i} className="border-s-2 border-[#B4975A] ps-3 py-1">
                          <div className="text-xs text-slate-500">{formatDate(u.date, true)}</div>
                          <div className="text-sm">{u.note}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!readOnly && (<>
                    <Input
                      placeholder={t("add_update")}
                      value={updateNote}
                      onChange={(e) => setUpdateNote(e.target.value)}
                      data-testid="case-update-input"
                    />
                    <Button onClick={addUpdate} data-testid="case-update-add" className="bg-slate-900 hover:bg-slate-800">
                      {t("add_update")}
                    </Button>
                    </>)}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= DOCUMENTS =============
function DocumentsSection({ clients }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [docs, setDocs] = useState([]);
  const [cases, setCases] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", case_id: "", title: "", file: null });

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      lawyerApi.get("/documents"),
      lawyerApi.get("/cases"),
    ]);
    setDocs(d.data); setCases(c.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.client_id || !form.file) return toast.error(t("error"));
    const fd = new FormData();
    fd.append("client_id", form.client_id);
    if (form.case_id && form.case_id !== "__none__") fd.append("case_id", form.case_id);
    if (form.title) fd.append("title", form.title);
    fd.append("file", form.file);
    try {
      await lawyerApi.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(t("saved"));
      setOpen(false);
      setForm({ client_id: "", case_id: "", title: "", file: null });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await lawyerApi.delete(`/documents/${id}`);
    load();
  };

  const download = (id) => {
    const token = localStorage.getItem("lawyer_token");
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const doc = docs.find((d) => d.document_id === id);
        link.download = doc?.filename || "document";
        link.click();
      });
  };

  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "-";
  const caseTitle = (id) => cases.find((c) => c.case_id === id)?.title || "-";
  const relevantCases = form.client_id ? cases.filter((c) => c.client_id === form.client_id) : [];

  return (
    <div className="space-y-4" data-testid="documents-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{t("dash_documents")}</h2>
        {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 gap-2" data-testid="upload-doc-btn">
              <Upload className="w-4 h-4" /> {t("upload_doc")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="doc-dialog">
            <DialogHeader><DialogTitle>{t("upload_doc")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label={t("dash_clients")}>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, case_id: "" })}>
                  <SelectTrigger data-testid="doc-client"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("doc_case")}>
                <Select value={form.case_id || "__none__"} onValueChange={(v) => setForm({ ...form, case_id: v })}>
                  <SelectTrigger data-testid="doc-case"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("none")}</SelectItem>
                    {relevantCases.map((c) => <SelectItem key={c.case_id} value={c.case_id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("doc_title")}>
                <Input data-testid="doc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label={t("doc_file")}>
                <Input type="file" data-testid="doc-file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={submit} data-testid="doc-save-btn" className="bg-slate-900 hover:bg-slate-800">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {docs.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("doc_title")}</TableHead>
                  <TableHead>{t("dash_clients")}</TableHead>
                  <TableHead>{t("doc_case")}</TableHead>
                  <TableHead>{t("inv_desc")}</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.document_id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell>{clientName(d.client_id)}</TableCell>
                    <TableCell className="text-sm">{d.case_id ? caseTitle(d.case_id) : "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(d.uploaded_at)}</TableCell>
                    <TableCell className="text-end">
                      <Button size="icon" variant="ghost" onClick={() => download(d.document_id)} data-testid={`doc-dl-${d.document_id}`}><Download className="w-4 h-4" /></Button>
                      {!readOnly && (
                      <Button size="icon" variant="ghost" onClick={() => del(d.document_id)} className="text-red-600" data-testid={`doc-del-${d.document_id}`}><Trash2 className="w-4 h-4" /></Button>
                      )}
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

// ============= INVOICES =============
function InvoicesSection({ clients }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [invoices, setInvoices] = useState([]);
  const [cases, setCases] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { client_id: "", case_id: "", description: "", amount: 0, paid_amount: 0, due_date: "" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([lawyerApi.get("/invoices"), lawyerApi.get("/cases")]);
    setInvoices(a.data); setCases(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (i) => {
    setEditing(i);
    setForm({ client_id: i.client_id, case_id: i.case_id || "", description: i.description, amount: i.amount, paid_amount: i.paid_amount, due_date: i.due_date || "" });
    setOpen(true);
  };
  const save = async () => {
    try {
      const body = { ...form, amount: Number(form.amount), paid_amount: Number(form.paid_amount) };
      if (body.case_id === "__none__") body.case_id = null;
      if (editing) {
        // patch
        const patch = { description: body.description, amount: body.amount, paid_amount: body.paid_amount, due_date: body.due_date };
        await lawyerApi.patch(`/invoices/${editing.invoice_id}`, patch);
      } else await lawyerApi.post("/invoices", body);
      toast.success(t("saved"));
      setOpen(false); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await lawyerApi.delete(`/invoices/${id}`);
    load();
  };

  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "-";
  const caseTitle = (id) => cases.find((c) => c.case_id === id)?.title || "-";
  const relevantCases = form.client_id ? cases.filter((c) => c.client_id === form.client_id) : [];

  return (
    <div className="space-y-4" data-testid="invoices-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{t("dash_invoices")}</h2>
        {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="add-invoice-btn" className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" /> {t("add_invoice")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="invoice-dialog">
            <DialogHeader><DialogTitle>{editing ? t("edit") : t("add_invoice")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label={t("dash_clients")}>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, case_id: "" })} disabled={!!editing}>
                  <SelectTrigger data-testid="inv-client"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("doc_case")}>
                <Select value={form.case_id || "__none__"} onValueChange={(v) => setForm({ ...form, case_id: v })} disabled={!!editing}>
                  <SelectTrigger data-testid="inv-case"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("none")}</SelectItem>
                    {relevantCases.map((c) => <SelectItem key={c.case_id} value={c.case_id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("inv_desc")}>
                <Input data-testid="inv-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("inv_amount")}>
                  <Input type="number" data-testid="inv-amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </Field>
                <Field label={t("inv_paid")}>
                  <Input type="number" data-testid="inv-paid" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
                </Field>
              </div>
              <Field label={t("inv_due")}>
                <Input type="date" data-testid="inv-due" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={save} data-testid="inv-save-btn" className="bg-slate-900 hover:bg-slate-800">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {invoices.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("inv_desc")}</TableHead>
                  <TableHead>{t("dash_clients")}</TableHead>
                  <TableHead>{t("inv_amount")}</TableHead>
                  <TableHead>{t("inv_paid")}</TableHead>
                  <TableHead>{t("case_status")}</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.invoice_id} data-testid={`inv-row-${i.invoice_id}`}>
                    <TableCell className="font-medium">
                      {i.description}
                      {i.case_id && <div className="text-xs text-slate-500">{caseTitle(i.case_id)}</div>}
                    </TableCell>
                    <TableCell>{clientName(i.client_id)}</TableCell>
                    <TableCell dir="ltr">{money(i.amount)}</TableCell>
                    <TableCell dir="ltr">{money(i.paid_amount)}</TableCell>
                    <TableCell><StatusBadge status={i.status} label={t(`inv_status_${i.status}`)} /></TableCell>
                    <TableCell className="text-end">
                      {!readOnly && (<>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Edit3 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(i.invoice_id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </>)}
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

// ============= MESSAGES =============
function MessagesSection({ clients }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    if (!selected) return;
    const { data } = await lawyerApi.get("/messages", { params: { client_id: selected } });
    setMessages(data);
  }, [selected]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    if (!text.trim() || !selected) return;
    await lawyerApi.post("/messages", { client_id: selected, content: text });
    setText(""); load();
  };

  return (
    <div className="space-y-4" data-testid="messages-section">
      <h2 className="font-heading text-2xl font-bold">{t("dash_messages")}</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border border-slate-200 rounded-md">
          <CardContent className="p-0 max-h-[65vh] overflow-y-auto">
            {clients.length === 0 && <Empty>{t("no_data")}</Empty>}
            {clients.map((c) => (
              <button
                key={c.client_id}
                onClick={() => setSelected(c.client_id)}
                data-testid={`msg-client-${c.client_id}`}
                className={`w-full text-start px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${selected === c.client_id ? "bg-slate-100" : ""}`}
              >
                <div className="font-medium">{c.name}</div>
                <div dir="ltr" className="text-xs text-slate-500">{c.email}</div>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="md:col-span-2 border border-slate-200 rounded-md flex flex-col h-[65vh]">
          <CardContent className="flex-1 p-4 overflow-y-auto space-y-2">
            {!selected ? <Empty>{t("select_client_to_chat")}</Empty> : (
              messages.length === 0 ? <Empty>{t("no_data")}</Empty> :
              messages.map((m) => (
                <div key={m.message_id} className={`flex ${m.sender === "lawyer" ? "justify-end" : "justify-start"}`}>
                  <div className={`px-3 py-2 max-w-[75%] text-sm ${m.sender === "lawyer" ? "bubble-lawyer" : "bubble-client"}`}>
                    <div>{m.content}</div>
                    <div className={`text-[10px] mt-1 opacity-70`}>{formatDate(m.created_at, true)}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          {selected && !readOnly && (
            <div className="p-3 border-t border-slate-200 flex gap-2">
              <Input
                data-testid="msg-input"
                placeholder={t("msg_placeholder")}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <Button onClick={send} data-testid="msg-send-btn" className="bg-slate-900 hover:bg-slate-800 gap-2">
                <Send className="w-4 h-4" />{t("send")}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============= NOTIFICATIONS =============
function NotificationsSection({ clients }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "__all__", title: "", body: "" });

  const load = useCallback(async () => {
    const { data } = await lawyerApi.get("/notifications");
    setNotifs(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    try {
      const body = {
        client_id: form.client_id === "__all__" ? null : form.client_id,
        title: form.title,
        body: form.body,
      };
      await lawyerApi.post("/notifications", body);
      toast.success(t("sent"));
      setOpen(false);
      setForm({ client_id: "__all__", title: "", body: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("error")); }
  };

  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "-";

  return (
    <div className="space-y-4" data-testid="notifications-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{t("dash_notifications")}</h2>
        {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 gap-2" data-testid="add-notif-btn">
              <Bell className="w-4 h-4" />{t("send_notification")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="notif-dialog">
            <DialogHeader><DialogTitle>{t("send_notification")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label={t("notif_target")}>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger data-testid="notif-target"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("notif_all")}</SelectItem>
                    {clients.map((c) => <SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("notif_title")}>
                <Input data-testid="notif-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label={t("notif_body")}>
                <Textarea data-testid="notif-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={send} className="bg-slate-900 hover:bg-slate-800" data-testid="notif-send-btn">{t("send")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {notifs.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("notif_title")}</TableHead>
                  <TableHead>{t("notif_body")}</TableHead>
                  <TableHead>{t("dash_clients")}</TableHead>
                  <TableHead>{t("inv_desc")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifs.map((n) => (
                  <TableRow key={n.notification_id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="text-sm max-w-md truncate">{n.body}</TableCell>
                    <TableCell>{clientName(n.client_id)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(n.created_at, true)}</TableCell>
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

// ============= APPOINTMENTS =============
function AppointmentsSection({ clients }) {
  const { t } = useLang();
  const { readOnly } = useRole();
  const [appts, setAppts] = useState([]);

  const load = useCallback(async () => {
    const { data } = await lawyerApi.get("/appointments");
    setAppts(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id, status) => {
    await lawyerApi.patch(`/appointments/${id}`, { status });
    toast.success(t("saved"));
    load();
  };
  const clientName = (id) => clients.find((c) => c.client_id === id)?.name || "-";

  return (
    <div className="space-y-4" data-testid="appointments-section">
      <h2 className="font-heading text-2xl font-bold">{t("dash_appointments")}</h2>
      <Card className="border border-slate-200 rounded-md">
        <CardContent className="p-0">
          {appts.length === 0 ? <Empty>{t("no_data")}</Empty> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dash_clients")}</TableHead>
                  <TableHead>{t("appt_date")}</TableHead>
                  <TableHead>{t("appt_purpose")}</TableHead>
                  <TableHead>{t("case_status")}</TableHead>
                  <TableHead className="w-56"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appts.map((a) => (
                  <TableRow key={a.appointment_id} data-testid={`appt-row-${a.appointment_id}`}>
                    <TableCell className="font-medium">{clientName(a.client_id)}</TableCell>
                    <TableCell>{formatDate(a.date, true)}</TableCell>
                    <TableCell className="text-sm">{a.purpose}</TableCell>
                    <TableCell><StatusBadge status={a.status} label={t(`appt_status_${a.status}`)} /></TableCell>
                    <TableCell className="text-end space-x-1 rtl:space-x-reverse">
                      {!readOnly && a.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => patch(a.appointment_id, "confirmed")} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`appt-confirm-${a.appointment_id}`}>{t("confirm")}</Button>
                          <Button size="sm" variant="outline" onClick={() => patch(a.appointment_id, "cancelled")} data-testid={`appt-cancel-${a.appointment_id}`}>{t("cancel_appt")}</Button>
                        </>
                      )}
                      {!readOnly && a.status === "confirmed" && (
                        <Button size="sm" variant="outline" onClick={() => patch(a.appointment_id, "done")}>{t("appt_status_done")}</Button>
                      )}
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

// ============= HELPER =============
function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</Label>
      {children}
    </div>
  );
}

// ============= PROPERTIES (both owner & partner can manage) =============
function PropertiesSection() {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const emptyForm = {
    title: "", property_type: "apartment", listing_type: "for_sale",
    area_m2: 0, price: 0, currency: "IQD", bedrooms: 0, bathrooms: 0, floor: 0,
    address: "", description: "", features: "", contact_phone: "07726317519", is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const { data } = await lawyerApi.get("/properties");
    setItems(data);
    if (viewing) {
      const refreshed = data.find((p) => p.property_id === viewing.property_id);
      if (refreshed) setViewing(refreshed);
    }
  }, [viewing]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      title: p.title, property_type: p.property_type, listing_type: p.listing_type,
      area_m2: p.area_m2 || 0, price: p.price || 0, currency: p.currency || "IQD",
      bedrooms: p.bedrooms || 0, bathrooms: p.bathrooms || 0, floor: p.floor || 0,
      address: p.address || "", description: p.description || "",
      features: (p.features || []).join(", "),
      contact_phone: p.contact_phone || "07726317519",
      is_active: p.is_active !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const body = {
        ...form,
        area_m2: Number(form.area_m2) || 0,
        price: Number(form.price) || 0,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        floor: Number(form.floor) || 0,
        features: form.features
          ? form.features.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (editing) await lawyerApi.patch(`/properties/${editing.property_id}`, body);
      else await lawyerApi.post("/properties", body);
      toast.success(t("saved"));
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await lawyerApi.delete(`/properties/${id}`);
    toast.success(t("deleted"));
    load();
  };

  const uploadImage = async (property_id, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await lawyerApi.post(`/properties/${property_id}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(t("saved"));
      // Update local state immediately
      setItems((prev) => prev.map((p) => (p.property_id === property_id ? data : p)));
      if (viewing && viewing.property_id === property_id) setViewing(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };

  const delImage = async (property_id, idx) => {
    try {
      const { data } = await lawyerApi.delete(`/properties/${property_id}/images/${idx}`);
      setItems((prev) => prev.map((p) => (p.property_id === property_id ? data : p)));
      if (viewing && viewing.property_id === property_id) setViewing(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };

  return (
    <div className="space-y-4" data-testid="properties-section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">{t("properties_title")}</h2>
          <div className="text-xs text-slate-500 mt-0.5">
            {t("managed_by")}: {lang === "ar" ? "يونس محمود سلمان" : "Younes Mahmoud Salman"}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="add-property-btn" className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" /> {t("add_property")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="property-dialog">
            <DialogHeader>
              <DialogTitle>{editing ? t("edit_property") : t("add_property")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <Field label={t("prop_title")}>
                <Input data-testid="prop-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("prop_type")}>
                  <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                    <SelectTrigger data-testid="prop-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["apartment", "house", "villa", "land", "commercial", "office"].map((x) => (
                        <SelectItem key={x} value={x}>{t(`type_${x}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("prop_listing")}>
                  <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v })}>
                    <SelectTrigger data-testid="prop-listing"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["for_sale", "for_rent", "sold", "rented"].map((x) => (
                        <SelectItem key={x} value={x}>{t(`listing_${x}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label={`${t("prop_area")} (${t("prop_sq_meter")})`}>
                  <Input type="number" data-testid="prop-area" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} />
                </Field>
                <Field label={t("prop_price")}>
                  <Input type="number" data-testid="prop-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </Field>
                <Field label={t("prop_currency")}>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger data-testid="prop-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IQD">IQD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("prop_bedrooms")}>
                  <Input type="number" data-testid="prop-beds" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                </Field>
                <Field label={t("prop_bathrooms")}>
                  <Input type="number" data-testid="prop-baths" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                </Field>
                <Field label={t("prop_floor")}>
                  <Input type="number" data-testid="prop-floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
                </Field>
              </div>
              <Field label={t("prop_address")}>
                <Input data-testid="prop-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label={t("prop_description")}>
                <Textarea rows={4} data-testid="prop-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label={`${t("prop_features")} (${lang === "ar" ? "افصل بفواصل" : "comma separated"})`}>
                <Input data-testid="prop-features" placeholder={lang === "ar" ? "موقف سيارة, مصعد, حديقة" : "parking, elevator, garden"} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
              </Field>
              <Field label={t("prop_contact")}>
                <Input data-testid="prop-contact" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </Field>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prop-active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="prop-active"
                />
                <Label htmlFor="prop-active" className="text-sm">{t("prop_active")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={save} data-testid="prop-save-btn" className="bg-slate-900 hover:bg-slate-800">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Empty>{t("prop_no_data")}</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <PropertyAdminCard
              key={p.property_id}
              p={p}
              onEdit={() => openEdit(p)}
              onDelete={() => del(p.property_id)}
              onManage={() => setViewing(p)}
            />
          ))}
        </div>
      )}

      {/* Image manager dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl" data-testid="prop-images-dialog">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.title} — {t("prop_images")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-md p-6 cursor-pointer hover:border-[#B4975A] text-slate-600">
                  <ImagePlus className="w-5 h-5" />
                  <span>{t("prop_upload_image")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    data-testid="prop-image-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(viewing.property_id, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {viewing.image_urls?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {viewing.image_urls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-[4/3] rounded border border-slate-200 overflow-hidden">
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}${url}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => delImage(viewing.property_id, idx)}
                          className="absolute top-1 end-1 w-7 h-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600"
                          data-testid={`prop-img-del-${idx}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 text-center py-6">{t("no_data")}</div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyAdminCard({ p, onEdit, onDelete, onManage }) {
  const { t } = useLang();
  const img = p.image_urls?.[0] ? `${process.env.REACT_APP_BACKEND_URL}${p.image_urls[0]}` : null;
  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden" data-testid={`admin-prop-${p.property_id}`}>
      <div className="relative aspect-[4/3] bg-slate-100">
        {img ? (
          <img src={img} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Building2 className="w-14 h-14" />
          </div>
        )}
        <div className="absolute top-2 start-2 flex gap-1.5">
          <Badge className="bg-[#B4975A] text-slate-900 border-0 text-[10px] font-semibold">
            {t(`listing_${p.listing_type}`)}
          </Badge>
          {!p.is_active && (
            <Badge className="bg-slate-900/80 text-white border-0 text-[10px]">
              {t("prop_inactive")}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="font-heading font-bold text-slate-900 line-clamp-1">{p.title}</div>
        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{p.address || "-"}</div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          {p.area_m2 > 0 && <span dir="ltr">{p.area_m2} {t("prop_sq_meter")}</span>}
          {p.bedrooms > 0 && <span>{p.bedrooms} 🛏</span>}
          {p.bathrooms > 0 && <span>{p.bathrooms} 🛁</span>}
        </div>
        {p.price > 0 && (
          <div className="mt-2 font-heading font-bold text-slate-900" dir="ltr">
            {Number(p.price).toLocaleString()} <span className="text-xs text-slate-500">{p.currency}</span>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={onManage} data-testid={`prop-manage-${p.property_id}`} className="flex-1">
            <ImagePlus className="w-3.5 h-3.5 me-1" /> {t("prop_images")}
          </Button>
          <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`prop-edit-${p.property_id}`}>
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="text-red-600" data-testid={`prop-del-${p.property_id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============= ARTICLES (both owner & partner can manage) =============
function ArticlesSection() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = {
    article_type: "article",
    title: "",
    content: "",
    external_url: "",
    tags: "",
    is_published: true,
    file: null,
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await lawyerApi.get("/articles");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      article_type: a.article_type,
      title: a.title,
      content: a.content || "",
      external_url: a.external_url || "",
      tags: (a.tags || []).join(", "),
      is_published: a.is_published !== false,
      file: null,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        // PATCH only accepts JSON for text fields
        await lawyerApi.patch(`/articles/${editing.article_id}`, {
          title: form.title,
          content: form.content,
          external_url: form.external_url || null,
          tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
          is_published: form.is_published,
        });
      } else {
        const fd = new FormData();
        fd.append("article_type", form.article_type);
        fd.append("title", form.title);
        fd.append("content", form.content || "");
        if (form.external_url) fd.append("external_url", form.external_url);
        fd.append("tags", form.tags || "");
        fd.append("is_published", form.is_published ? "true" : "false");
        if (form.file) fd.append("file", form.file);
        await lawyerApi.post("/articles", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(t("saved"));
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("error"));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await lawyerApi.delete(`/articles/${id}`);
    toast.success(t("deleted"));
    load();
  };

  const typeIcon = {
    article: FileText,
    image: ImageIcon,
    video: Video,
    document: FileArchive,
  };

  return (
    <div className="space-y-4" data-testid="articles-section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading text-2xl font-bold">{t("articles_title")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="add-article-btn" className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" /> {t("art_add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="article-dialog">
            <DialogHeader>
              <DialogTitle>{editing ? t("art_edit") : t("art_add")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {!editing && (
                <Field label={t("art_type")}>
                  <Select value={form.article_type} onValueChange={(v) => setForm({ ...form, article_type: v })}>
                    <SelectTrigger data-testid="art-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">{t("art_articles")}</SelectItem>
                      <SelectItem value="image">{t("art_images")}</SelectItem>
                      <SelectItem value="video">{t("art_videos")}</SelectItem>
                      <SelectItem value="document">{t("art_documents")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label={t("prop_title")}>
                <Input data-testid="art-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label={t("art_content")}>
                <Textarea rows={6} data-testid="art-content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </Field>
              {!editing && form.article_type !== "article" && (
                <Field label={t("art_file")}>
                  <Input
                    type="file"
                    data-testid="art-file"
                    accept={
                      form.article_type === "image" ? "image/*" :
                      form.article_type === "video" ? "video/*" : "*"
                    }
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                  />
                </Field>
              )}
              {(editing ? editing.article_type === "video" : form.article_type === "video") && (
                <Field label={t("art_url")}>
                  <Input data-testid="art-url" placeholder="https://youtube.com/watch?v=..." value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
                </Field>
              )}
              <Field label={t("art_tags")}>
                <Input data-testid="art-tags" placeholder="قانون مدني, استشارة" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </Field>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="art-pub"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="art-publish"
                />
                <Label htmlFor="art-pub" className="text-sm">{t("art_publish")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={save} data-testid="art-save-btn" className="bg-slate-900 hover:bg-slate-800">{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Empty>{t("art_no_data")}</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => {
            const Icon = typeIcon[a.article_type] || FileText;
            const mediaUrl = a.media_url ? `${process.env.REACT_APP_BACKEND_URL}${a.media_url}` : null;
            return (
              <div key={a.article_id} data-testid={`admin-art-${a.article_id}`} className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col">
                <div className="relative aspect-[16/10] bg-slate-100">
                  {a.article_type === "image" && mediaUrl ? (
                    <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Icon className="w-14 h-14" />
                    </div>
                  )}
                  <div className="absolute top-2 start-2 flex gap-1.5">
                    <Badge className="bg-slate-900/85 text-white border-0 text-[10px]">
                      {t(`art_${a.article_type}s`)}
                    </Badge>
                    {!a.is_published && (
                      <Badge className="bg-amber-500 text-slate-900 border-0 text-[10px]">
                        {t("prop_inactive")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="font-heading font-bold text-slate-900 line-clamp-2">{a.title}</div>
                  {a.content && <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{a.content}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{a.views_count || 0}</span>
                    <span className="truncate">{a.author_name}</span>
                  </div>
                  <div className="mt-3 flex gap-2 pt-3 border-t border-slate-100">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)} data-testid={`art-edit-${a.article_id}`}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => del(a.article_id)} className="text-red-600" data-testid={`art-del-${a.article_id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

