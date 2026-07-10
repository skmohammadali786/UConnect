import { useEffect, useState, type ComponentType } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Menu,
  PackageCheck,
  PanelTop,
  Search,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
} from "lucide-react";

import { modules as discoveredModules } from "./.generated/mockup-components";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) {
          return;
        }
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return null;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname } = window.location;
  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

const categories = ["Sarees", "Lehengas", "Kurti Sets", "Menswear"];
const orders = [
  {
    id: "ORD-2048",
    label: "Custom bridal lehenga",
    status: "Stitching",
    eta: "Jul 18",
    progress: 62,
  },
  {
    id: "ORD-2047",
    label: "Silk saree fall & pico",
    status: "Ready to ship",
    eta: "Jul 11",
    progress: 88,
  },
  {
    id: "ORD-2046",
    label: "Festive kurti set",
    status: "Delivered",
    eta: "Jul 08",
    progress: 100,
  },
];

function Storefront() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fff7ed] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">Vastra Studio</p>
              <p className="hidden text-xs text-stone-500 sm:block">
                Custom ethnic wear & tailoring
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-stone-600 md:flex">
            <a href="#shop">Shop</a>
            <a href="#orders">Orders</a>
            <a href="#admin">Admin</a>
            <a href="#login">Login</a>
          </nav>
          <button
            className="rounded-2xl border border-orange-100 bg-white p-3 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.05fr_.95fr] md:py-14 lg:px-8">
        <div className="space-y-6 text-center md:text-left">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
            Mobile-first boutique experience
          </span>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-7xl">
            Elegant outfits, custom orders, and live delivery tracking.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-stone-600 sm:text-lg md:mx-0">
            Browse curated categories, request made-to-measure work, and follow
            every order from confirmation to doorstep delivery.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <button className="rounded-2xl bg-stone-950 px-6 py-4 font-bold text-white shadow-xl shadow-stone-950/15">
              Start shopping
            </button>
            <button className="rounded-2xl border border-orange-200 bg-white px-6 py-4 font-bold text-stone-900">
              Track order
            </button>
          </div>
        </div>
        <div className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-rose-500 p-3 shadow-2xl shadow-orange-500/20">
          <div className="rounded-[1.5rem] bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <b>Today&apos;s picks</b>
              <Search className="size-5 text-stone-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category, index) => (
                <div className="rounded-3xl bg-orange-50 p-4" key={category}>
                  <div className="mb-8 h-24 rounded-2xl bg-gradient-to-br from-orange-200 to-rose-200" />
                  <p className="font-bold">{category}</p>
                  <p className="text-sm text-stone-500">
                    {12 + index * 4} styles
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="orders"
        className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8"
      >
        <div className="rounded-[2rem] bg-white p-5 shadow-sm md:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Order history</h2>
              <p className="text-stone-500">
                Customer timeline with accurate status tracking.
              </p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 font-bold text-white">
              <Truck className="size-4" /> Track all
            </button>
          </div>
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                className="rounded-3xl border border-orange-100 p-4"
                key={order.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-orange-600">
                      {order.id}
                    </p>
                    <h3 className="font-black">{order.label}</h3>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                    {order.status}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-orange-600"
                    style={{ width: `${order.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  Estimated update: {order.eta}
                </p>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] bg-stone-950 p-5 text-white shadow-xl shadow-stone-950/15">
          <ClipboardList className="mb-4 size-8 text-orange-300" />
          <h2 className="text-2xl font-black">Custom order desk</h2>
          <p className="mt-2 text-stone-300">
            Admin can review measurements, fabric, priority, advance payment,
            and production notes from one queue.
          </p>
          <button className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-bold text-stone-950">
            Open custom orders
          </button>
        </div>
      </section>

      <section
        id="admin"
        className="mx-auto grid max-w-7xl gap-5 px-4 py-6 pb-12 sm:px-6 md:grid-cols-3 lg:px-8"
      >
        {[
          {
            icon: PanelTop,
            title: "Admin panel",
            body: "Manage products, homepage sections, custom orders, and fulfillment updates.",
          },
          {
            icon: SlidersHorizontal,
            title: "Category manager",
            body: "Create, rename, reorder, publish, or hide storefront categories without code changes.",
          },
          {
            icon: PackageCheck,
            title: "Tracking workflow",
            body: "Move orders through pending, confirmed, stitching, shipped, and delivered states.",
          },
        ].map((item) => (
          <div
            className="rounded-[2rem] bg-white p-5 shadow-sm"
            key={item.title}
          >
            <item.icon className="mb-4 size-8 text-orange-600" />
            <h3 className="text-xl font-black">{item.title}</h3>
            <p className="mt-2 text-stone-600">{item.body}</p>
          </div>
        ))}
      </section>

      <section
        id="login"
        className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
      >
        <div className="grid gap-5 rounded-[2rem] bg-white p-5 shadow-sm md:grid-cols-[.9fr_1.1fr] md:p-8">
          <div>
            <Settings2 className="mb-4 size-8 text-orange-600" />
            <h2 className="text-2xl font-black">Account access</h2>
            <p className="mt-2 text-stone-600">
              Customers can sign up or log in with email, mobile number, and
              password.
            </p>
          </div>
          <form className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-2xl border border-orange-100 px-4 py-3"
              placeholder="Email"
            />
            <input
              className="rounded-2xl border border-orange-100 px-4 py-3"
              placeholder="Mobile number"
            />
            <input
              className="rounded-2xl border border-orange-100 px-4 py-3 sm:col-span-2"
              placeholder="Password"
              type="password"
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 font-bold text-white sm:col-span-2">
              <CheckCircle2 className="size-4" /> Continue
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

const App = () => {
  const previewPath = getPreviewPath();

  if (previewPath) {
    return (
      <PreviewRenderer
        componentPath={previewPath}
        modules={discoveredModules}
      />
    );
  }

  return <Storefront />;
};

export default App;
