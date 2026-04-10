import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useGetUserProfile, useUpdateUserProfile, useCreateLawyerProfile } from "@workspace/api-client-react";
import { User, Globe, Lock, Shield, Save, Loader2, CheckCircle } from "lucide-react";

const LANGUAGES = ["English", "Spanish", "French", "Arabic", "Chinese"];
const SPECIALIZATIONS = ["Corporate Law", "Criminal Defense", "Family Law", "Immigration", "Intellectual Property", "Real Estate", "Employment Law", "Tax Law", "Personal Injury", "Contract Law"];

export default function SettingsPage() {
  const { token, user, updateUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: profile } = useGetUserProfile({ query: { enabled: !!token } });
  const updateProfile = useUpdateUserProfile();
  const updateLawyer = useCreateLawyerProfile();

  const [form, setForm] = useState({
    firstName: "", lastName: "", bio: "", phone: "", avatarUrl: "", language: "English",
  });
  const [lawyerForm, setLawyerForm] = useState({
    barNumber: "", yearsOfExperience: 0, languages: ["English"], specialization: "Corporate Law", age: 30, bio: "", hourlyRate: 150,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        avatarUrl: profile.avatarUrl || "",
        language: profile.language || "English",
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile.mutateAsync({ data: form });
      if (user) updateUser({ ...user, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleSaveLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateLawyer.mutateAsync({ data: lawyerForm });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account preferences.</p>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          Changes saved successfully
        </div>
      )}

      {/* Profile Settings */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Profile Information</h2>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card/50">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">First Name</label>
                <input
                  type="text" value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Last Name</label>
                <input
                  type="text" value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Phone</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Avatar URL</label>
              <input
                type="url" value={form.avatarUrl}
                onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3} placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Preferred Language
              </label>
              <select
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">AI responses will be tailored to your preferred language</p>
            </div>
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>
      </div>

      {/* Lawyer Profile — only if LAWYER role */}
      {user?.role === "LAWYER" && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Professional Profile</h2>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50">
            <form onSubmit={handleSaveLawyer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Bar Number</label>
                  <input
                    type="text" value={lawyerForm.barNumber}
                    onChange={e => setLawyerForm(f => ({ ...f, barNumber: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Years of Experience</label>
                  <input
                    type="number" value={lawyerForm.yearsOfExperience} min={0}
                    onChange={e => setLawyerForm(f => ({ ...f, yearsOfExperience: parseInt(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Specialization</label>
                <select
                  value={lawyerForm.specialization}
                  onChange={e => setLawyerForm(f => ({ ...f, specialization: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Hourly Rate ($)</label>
                <input
                  type="number" value={lawyerForm.hourlyRate} min={0}
                  onChange={e => setLawyerForm(f => ({ ...f, hourlyRate: parseInt(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Professional Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Account Info */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Account</h2>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email Address</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Account Type</p>
              <p className="text-sm text-muted-foreground">{user?.role === "LAWYER" ? "Attorney" : "Standard User"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Membership</p>
              <p className="text-sm text-muted-foreground">{user?.membershipPlan === "PREMIUM" ? "Premium" : "Free Plan"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
