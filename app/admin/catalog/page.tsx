"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feedback } from "@/components/admin/feedback";
import { StatusPill } from "@/components/status-pill";
import { getErrorMessage } from "@/lib/errors";

type School = {
  _id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

type Category = {
  _id: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
};

type Tab = "schools" | "categories";

export default function CatalogPage() {
  const [tab, setTab] = useState<Tab>("schools");

  return (
    <div>
      <header>
        <p className="eyebrow text-flame">Reference data</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Catalog</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          Schools and categories are shared across every event. Archiving hides them from new
          work but keeps historical results intact.
        </p>
      </header>

      <div className="mt-6 flex gap-1">
        {(["schools", "categories"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`border px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
              tab === item
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5">{tab === "schools" ? <Schools /> : <Categories />}</div>
    </div>
  );
}

function Schools() {
  const schools = useQuery(api.admin.listSchools);
  const create = useMutation(api.admin.createSchool);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function add(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) return;
    setPending(true);
    try {
      await create({ name: name.trim(), displayOrder: Number(order) || 0 });
      setName("");
      setOrder("0");
      setSuccess("School added.");
    } catch (addError) {
      setError(getErrorMessage(addError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="display text-2xl">Schools</h2>
        </div>
        {schools === undefined ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : schools.length === 0 ? (
          <p className="p-4 text-sm text-muted">No schools yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {schools.map((school: School) => (
              <SchoolRow key={school._id} school={school} />
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={add} className="card h-fit p-5">
        <h2 className="display text-2xl">Add a school</h2>
        <Feedback error={error} success={success} />
        <div className="mt-4">
          <label htmlFor="school-name" className="label">
            School name
          </label>
          <input
            id="school-name"
            className="input"
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="mt-4">
          <label htmlFor="school-order" className="label">
            Display order
          </label>
          <input
            id="school-order"
            type="number"
            className="input"
            value={order}
            onChange={(inputEvent) => setOrder(inputEvent.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={pending}>
          {pending ? "Adding…" : "Add school"}
        </button>
      </form>
    </div>
  );
}

function SchoolRow({ school }: { school: School }) {
  const update = useMutation(api.admin.updateSchool);
  const archive = useMutation(api.admin.archiveSchool);
  const [name, setName] = useState(school.name);
  const [order, setOrder] = useState(String(school.displayOrder));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setPending(true);
    try {
      await update({
        schoolId: school._id as never,
        name: name.trim(),
        displayOrder: Number(order) || 0,
      });
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      if (school.isActive) {
        if (!window.confirm(`Archive ${school.name}? Historical scores are kept.`)) return;
        await archive({ schoolId: school._id as never });
      } else {
        await update({ schoolId: school._id as never, isActive: true });
      }
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    } finally {
      setPending(false);
    }
  }

  return (
    <li className={`p-4 ${school.isActive ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input min-h-9 flex-1 py-1 text-sm"
          value={name}
          onChange={(inputEvent) => setName(inputEvent.target.value)}
          aria-label={`Name for ${school.name}`}
        />
        <input
          type="number"
          className="input min-h-9 w-20 py-1 text-sm"
          value={order}
          onChange={(inputEvent) => setOrder(inputEvent.target.value)}
          aria-label={`Display order for ${school.name}`}
        />
        <StatusPill status={school.isActive ? "active" : "inactive"} />
        <button type="button" className="btn btn-ghost min-h-8 px-2 py-1 text-xs" onClick={save} disabled={pending}>
          Save
        </button>
        <button type="button" className="btn btn-ghost min-h-8 px-2 py-1 text-xs" onClick={toggle} disabled={pending}>
          {school.isActive ? "Archive" : "Restore"}
        </button>
      </div>
      <Feedback error={error} />
    </li>
  );
}

function Categories() {
  const categories = useQuery(api.admin.listCategories);
  const create = useMutation(api.admin.createCategory);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function add(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) return;
    setPending(true);
    try {
      await create({
        name: name.trim(),
        description: description.trim(),
        displayOrder: Number(order) || 0,
      });
      setName("");
      setDescription("");
      setOrder("0");
      setSuccess("Category added.");
    } catch (addError) {
      setError(getErrorMessage(addError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="display text-2xl">Categories</h2>
        </div>
        {categories === undefined ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="p-4 text-sm text-muted">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {categories.map((category: Category) => (
              <CategoryRow key={category._id} category={category} />
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={add} className="card h-fit p-5">
        <h2 className="display text-2xl">Add a category</h2>
        <Feedback error={error} success={success} />
        <div className="mt-4">
          <label htmlFor="category-name" className="label">
            Category name
          </label>
          <input
            id="category-name"
            className="input"
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="mt-4">
          <label htmlFor="category-description" className="label">
            Description
          </label>
          <textarea
            id="category-description"
            className="textarea min-h-20"
            value={description}
            onChange={(inputEvent) => setDescription(inputEvent.target.value)}
            maxLength={500}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="category-order" className="label">
            Display order
          </label>
          <input
            id="category-order"
            type="number"
            className="input"
            value={order}
            onChange={(inputEvent) => setOrder(inputEvent.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={pending}>
          {pending ? "Adding…" : "Add category"}
        </button>
      </form>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const update = useMutation(api.admin.updateCategory);
  const archive = useMutation(api.admin.archiveCategory);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [order, setOrder] = useState(String(category.displayOrder));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setPending(true);
    try {
      await update({
        categoryId: category._id as never,
        name: name.trim(),
        description: description.trim(),
        displayOrder: Number(order) || 0,
      });
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      if (category.isActive) {
        if (!window.confirm(`Archive ${category.name}? Its events must already be archived or cancelled.`)) {
          return;
        }
        await archive({ categoryId: category._id as never });
      } else {
        await update({ categoryId: category._id as never, isActive: true });
      }
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    } finally {
      setPending(false);
    }
  }

  return (
    <li className={`p-4 ${category.isActive ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input min-h-9 flex-1 py-1 text-sm"
          value={name}
          onChange={(inputEvent) => setName(inputEvent.target.value)}
          aria-label={`Name for ${category.name}`}
        />
        <input
          type="number"
          className="input min-h-9 w-20 py-1 text-sm"
          value={order}
          onChange={(inputEvent) => setOrder(inputEvent.target.value)}
          aria-label={`Display order for ${category.name}`}
        />
        <StatusPill status={category.isActive ? "active" : "inactive"} />
        <button type="button" className="btn btn-ghost min-h-8 px-2 py-1 text-xs" onClick={save} disabled={pending}>
          Save
        </button>
        <button type="button" className="btn btn-ghost min-h-8 px-2 py-1 text-xs" onClick={toggle} disabled={pending}>
          {category.isActive ? "Archive" : "Restore"}
        </button>
      </div>
      <input
        className="input mt-2 min-h-9 py-1 text-xs"
        value={description}
        onChange={(inputEvent) => setDescription(inputEvent.target.value)}
        placeholder="Description"
        maxLength={500}
        aria-label={`Description for ${category.name}`}
      />
      <Feedback error={error} />
    </li>
  );
}
