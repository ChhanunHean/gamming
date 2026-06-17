import { useEffect, useState } from 'react';
import { api } from './api.js';

const emptyForm = { title: '', description: '' };

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadItems() {
    try {
      setError('');
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await api.updateItem(editingId, form);
      } else {
        await api.createItem(form);
      }
      resetForm();
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description });
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.deleteItem(id);
      if (editingId === id) resetForm();
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">React + Express + SQLite</p>
          <h1>Full Stack Starter</h1>
          <p className="subtitle">
            A working CRUD app you can customize into your own project.
          </p>
        </div>
        <div className="stats">
          <span>{items.length}</span>
          <small>items saved</small>
        </div>
      </header>

      <main className="layout">
        <section className="panel form-panel">
          <h2>{editingId ? 'Edit item' : 'Add item'}</h2>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Title
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What do you want to track?"
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional details"
                rows={4}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update item' : 'Add item'}
              </button>
              {editingId && (
                <button type="button" className="secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel list-panel">
          <div className="list-header">
            <h2>Your items</h2>
            <button type="button" className="secondary" onClick={loadItems}>
              Refresh
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          {loading ? (
            <p className="muted">Loading items...</p>
          ) : items.length === 0 ? (
            <div className="empty">
              <p>No items yet.</p>
              <p className="muted">Add your first one using the form.</p>
            </div>
          ) : (
            <ul className="item-list">
              {items.map((item) => (
                <li key={item.id} className="item-card">
                  <div>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                    <time>{new Date(item.created_at).toLocaleString()}</time>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="secondary" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
