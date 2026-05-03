"use client";

import {
  Bell,
  Camera,
  Check,
  Copy,
  LogOut,
  QrCode,
  ShieldCheck,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

const ADMIN_EMAIL = "admin@konnectly.com";
const ADMIN_PASSWORD = "Admin@123";

type Tab =
  | "Approvals"
  | "Experience"
  | "Marketplace"
  | "Banners"
  | "Attendance"
  | "Scanner"
  | "Broadcast"
  | "Brand Login";

const tabs: Tab[] = [
  "Approvals",
  "Experience",
  "Marketplace",
  "Banners",
  "Attendance",
  "Scanner",
  "Broadcast",
  "Brand Login",
];

const users = [
  {
    name: "Raju",
    dob: "2019-03-04",
    school: "DPS",
    parent: "Anita",
    phone: "7439626036",
    address: "d, New Delhi, Delhi 110033",
    code: "KK-AV-25-0026",
  },
  {
    name: "Raju",
    dob: "",
    school: "",
    parent: "Anita",
    phone: "7439626036",
    address: "New Delhi, Delhi",
    code: "KK-AV-25-0025",
  },
  {
    name: "dk",
    dob: "",
    school: "",
    parent: "kk",
    phone: "9811279008",
    address: "New Delhi, Delhi",
    code: "KK-AV-25-0015",
  },
];

const activities = [
  ["Mar", "15", "RideFest 2025", "Phase 2 Main Park • ₹1"],
  ["Apr", "10", "Little Chefs Pop-up", "Community Center • ₹0"],
  ["Apr", "22", "Tribe Connect", "AV • ₹399"],
  ["Apr", "30", "Test Event", "Delhi • ₹400"],
  ["Apr", "30", "Test Demo", "New Delhi • ₹300"],
  ["Apr", "30", "hh", "Kolkata • ₹600"],
  ["May", "01", "Cyclathon", "Ashok Vihar • ₹5,000"],
];

const brands = [
  ["Deepak Bothra", "Deepak Bothra", "deepakb@gmail.com", "BR-D-955A"],
  ["Mr. Crust", "9810889180", "mrcrust@gmail.com", "BR-M-37F4"],
  ["Costa", "Deepak", "deepak@gmail.com", "BR-C-C61A"],
  ["Decathlon", "Decathlon", "brand+1@konnectly.local", "BR-1-B4CB"],
  ["Hamleys", "Hamleys", "brand+2@konnectly.local", "BR-2-D182"],
  ["wer", "wer", "brand+3@konnectly.local", "BR-3-4427"],
];

const vouchers = [
  ["MK", "wer", "KON--529835", "Active"],
  ["Anuj", "Costa", "KON-C-355655", "Claimed"],
  ["Ty", "wer", "KON-WER-08D1A6", "Claimed"],
  ["Rahul", "wer", "KON-WER-2A1F3F", "Claimed"],
  ["Dee", "wer", "KON-WER-4D44D7", "Claimed"],
  ["Ty", "wer", "KON-WER-6B1C51", "Active"],
  ["Rahul", "wer", "KON-WER-9E3267", "Claimed"],
];

const attendance = [
  ["hgh", "RideFest 2025", "50 ★", "Paid Pass"],
  ["Ty", "RideFest 2025", "50 ★", "Paid Pass"],
  ["Dee", "Little Chefs Pop-up", "0 ★", "Paid Pass"],
  ["Rahul", "Little Chefs Pop-up", "100 ★", "Paid Pass"],
  ["Rahul", "Little Chefs Pop-up", "0 ★", "Paid Pass"],
  ["Ty", "Little Chefs Pop-up", "50 ★", "Paid Pass"],
];

export default function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Approvals");
  const [error, setError] = useState("");
  const router = useRouter();

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("email") === ADMIN_EMAIL && form.get("password") === ADMIN_PASSWORD) {
      setIsAuthed(true);
      setError("");
    } else {
      setError("Wrong admin email or password.");
    }
  }

  function selectTab(tab: Tab) {
    if (tab === "Brand Login") {
      router.push("/brand");
      return;
    }

    setActiveTab(tab);
  }

  if (!isAuthed) {
    return <LoginShell error={error} onSubmit={login} />;
  }

  return (
    <main className="min-h-screen bg-[#f5f6fa] p-4 text-zinc-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-950 font-black text-yellow-300">
                K
              </div>
              <div>
                <h1 className="text-xl font-black">ADMIN HUB</h1>
                <p className="text-sm text-zinc-500">
                  Manage approvals, app content, rewards, partners and broadcasts.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthed(false)}
              className="flex w-fit items-center gap-2 rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600"
              type="button"
            >
              <LogOut size={17} /> Logout
            </button>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => selectTab(tab)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  activeTab === tab
                    ? "bg-yellow-400 text-zinc-950 shadow"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <Stat icon={<Users />} value="3" label="Pending Approvals" />
          <Stat icon={<Store />} value="6" label="Brand Logins" />
          <Stat icon={<Ticket />} value="7" label="Voucher Claims" />
          <Stat icon={<Bell />} value="12" label="Broadcasts Sent" />
        </section>

        <section className="mt-6">
          {activeTab === "Approvals" && <Approvals />}
          {activeTab === "Experience" && <Experience />}
          {activeTab === "Marketplace" && <Marketplace />}
          {activeTab === "Banners" && <Banners />}
          {activeTab === "Attendance" && <Attendance />}
          {activeTab === "Scanner" && <Scanner />}
          {activeTab === "Broadcast" && <Broadcast />}
        </section>
      </div>
    </main>
  );
}

function Approvals() {
  return (
    <Card title="Membership Approval Requests">
      <Table
        headers={["Profile", "Education", "Parent & Address", "Status", "Action"]}
        rows={users.map((user) => [
          <div key="profile">
            <button className="mb-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-black" type="button">
              VIEW
            </button>
            <p className="font-black">{user.name}</p>
            <p className="text-sm text-zinc-500">Born: {user.dob || "—"}</p>
          </div>,
          <div key="edu">
            <p className="font-bold">{user.school || "—"}</p>
            {user.school && <p className="mt-1 text-xs font-black text-emerald-600">ID Card</p>}
          </div>,
          <div key="parent">
            <p className="font-black">{user.parent}</p>
            <p className="text-sm text-zinc-500">{user.phone}</p>
            <p className="mt-1 text-sm text-zinc-500">{user.address}</p>
          </div>,
          <span key="status" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            {user.code}
          </span>,
          <button key="action" className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white" type="button">
            <Check size={17} />
          </button>,
        ])}
      />
    </Card>
  );
}

function Experience() {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Card title="New Experience">
        <div className="grid gap-3">
          <Input placeholder="Event Title" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" />
            <Input type="time" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Price (₹)" type="number" />
            <Input placeholder="Location" />
          </div>
          <select className="rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none">
            <option>Explore</option>
            <option>Engage</option>
            <option>Experience</option>
          </select>
          <textarea className="min-h-28 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Short description..." />
          <button className="rounded-xl bg-yellow-400 px-5 py-3 font-black" type="button">
            Publish Activity
          </button>
        </div>
      </Card>
      <Card title="Published Activity Feed">
        <div className="space-y-3">
          {activities.map(([month, day, title, meta]) => (
            <FeedItem key={`${month}-${day}-${title}`} month={month} day={day} title={title} meta={meta} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function Marketplace() {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-5">
        <Card title="Claim Voucher">
          <div className="flex gap-3">
            <Input placeholder="KON-XXX-XXXX" />
            <button className="rounded-xl bg-zinc-950 px-5 font-black text-white" type="button">
              Verify & Claim
            </button>
          </div>
        </Card>
        <Card title="Add Reward Partner">
          <div className="grid gap-3">
            <Input placeholder="Brand Name" />
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Points Required" type="number" />
              <Input placeholder="Reward Value (e.g. ₹500)" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Soft Blue" />
              <Input placeholder="fa-gift" />
            </div>
            <h3 className="pt-2 font-black">Partner Login</h3>
            <Input placeholder="Contact Person" />
            <Input placeholder="Brand Login Email" type="email" />
            <Input placeholder="Temporary Password" type="password" />
            <button className="rounded-xl bg-yellow-400 px-5 py-3 font-black" type="button">
              Publish Brand
            </button>
          </div>
        </Card>
      </div>
      <div className="space-y-5">
        <Card title="Brand Partner Logins" note="Share these credentials with partner brands. Passwords are hidden after creation.">
          <Table
            headers={["Brand", "Contact", "Email", "Referral Code", "Status"]}
            rows={brands.map(([brand, contact, email, code]) => [
              <b key="brand">{brand}</b>,
              contact,
              email,
              <span key="code" className="font-mono text-xs">{code}</span>,
              <span key="status" className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Active</span>,
            ])}
          />
        </Card>
        <Card title="Voucher Redemption Feed">
          <Table
            headers={["Member", "Brand", "Code", "Status", "Action"]}
            rows={vouchers.map(([member, brand, code, status]) => [
              member,
              brand,
              <span key="code" className="font-mono text-xs">{code}</span>,
              status,
              status === "Active" ? (
                <button key="claim" className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black" type="button">Claim</button>
              ) : (
                <span key="verified" className="font-black text-emerald-600">Verified ✓</span>
              ),
            ])}
          />
        </Card>
      </div>
    </div>
  );
}

function Banners() {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Card title="New Dashboard Slide">
        <div className="grid gap-3">
          <Input placeholder="Banner Title" />
          <Input placeholder="Subtitle" />
          <Input placeholder="Image URL (promo.png)" />
          <Input placeholder="Redirect Link (e.g. ?view=events)" />
          <button className="rounded-xl bg-yellow-400 px-5 py-3 font-black" type="button">
            Push Live
          </button>
        </div>
      </Card>
      <Card title="Active Promotion Slides">
        <div className="grid gap-3">
          <Promo title="Cyclathon" target="www.konnectly.org" />
          <Promo title="RideFest 2025" target="?view=events" />
        </div>
      </Card>
    </div>
  );
}

function Attendance() {
  return (
    <Card title="Attendance & Manual Gate Entry">
      <Table
        headers={["Member", "Experience", "Current Pts", "Status", "Gate Check"]}
        rows={attendance.map(([member, event, points, status]) => [
          member,
          event,
          points,
          status,
          <span key="verified" className="font-black text-emerald-600">Verified ✓</span>,
        ])}
      />
    </Card>
  );
}

function Scanner() {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card title="Gate Scanner" note="Official Community Hub">
        <button className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50 py-16 text-zinc-950" type="button">
          <Camera size={42} />
          <span className="mt-3 text-lg font-black">Start Gate Camera</span>
        </button>
      </Card>
      <Card title="Scanner Tools">
        <div className="grid gap-3 md:grid-cols-2">
          <Tool icon={<QrCode />} title="Member QR" body="Scan member pass or voucher." />
          <Tool icon={<ShieldCheck />} title="Manual Verify" body="Check pass status by code." />
        </div>
      </Card>
    </div>
  );
}

function Broadcast() {
  const history = [
    ["29 Apr, 05:57 AM", "Cyclathon is coming up! yAYYY"],
    ["27 Apr, 05:30 PM", "hi"],
    ["27 Apr, 05:29 PM", "hi"],
    ["20 Apr, 05:37 AM", "hi"],
    ["20 Apr, 05:35 AM", "hi"],
    ["20 Apr, 05:34 AM", "hi"],
    ["20 Apr, 05:32 AM", "ggg"],
    ["20 Apr, 05:24 AM", "dd"],
    ["20 Apr, 05:11 AM", "dddd"],
    ["19 Apr, 04:08 PM", "knvjfkbvifv"],
    ["19 Apr, 04:08 PM", "xxx"],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Card title="Global Broadcast" note="Pushes an instant alert to all tribe member hub banners.">
        <div className="grid gap-3">
          <textarea className="min-h-32 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Type tribe update..." />
          <select className="rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none">
            <option>Standard (Blue)</option>
            <option>Important (Yellow)</option>
            <option>Urgent (Red)</option>
          </select>
          <button className="rounded-xl bg-zinc-950 px-5 py-3 font-black text-white" type="button">
            Launch Official Broadcast
          </button>
        </div>
      </Card>
      <Card title="Broadcast History">
        <div className="space-y-3">
          {history.map(([date, message], index) => (
            <div key={`${date}-${message}-${index}`} className="rounded-xl bg-zinc-50 p-3">
              <p className="text-xs font-black text-zinc-500">{date}</p>
              <p className="mt-1 font-semibold">{message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LoginShell({ error, onSubmit }: { error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 px-5">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h1 className="text-3xl font-black">Admin Login</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Demo ID: <b>{ADMIN_EMAIL}</b>
          <br />
          Password: <b>{ADMIN_PASSWORD}</b>
        </p>
        <Input name="email" placeholder={ADMIN_EMAIL} type="email" className="mt-6" />
        <Input name="password" placeholder={ADMIN_PASSWORD} type="password" className="mt-3" />
        {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
        <button className="mt-5 w-full rounded-xl bg-zinc-950 py-3 font-black text-white" type="submit">
          Login
        </button>
      </form>
    </main>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black">{title}</h2>
        {note && <p className="mt-1 text-sm text-zinc-500">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-yellow-600">{icon}</div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="bg-zinc-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 first:rounded-l-xl last:rounded-r-xl">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-yellow-500 ${className}`}
    />
  );
}

function FeedItem({ month, day, title, meta }: { month: string; day: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-3">
      <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
        <p className="text-xs font-black text-zinc-500">{month}</p>
        <p className="text-xl font-black">{day}</p>
      </div>
      <div className="flex-1">
        <p className="font-black">{title}</p>
        <p className="text-sm text-zinc-500">{meta}</p>
      </div>
      <button className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black shadow-sm" type="button">
        <Copy size={14} /> Copy Share Link
      </button>
    </div>
  );
}

function Promo({ title, target }: { title: string; target: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">Target: {target}</p>
    </div>
  );
}

function Tool({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <div className="text-yellow-600">{icon}</div>
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{body}</p>
    </div>
  );
}
