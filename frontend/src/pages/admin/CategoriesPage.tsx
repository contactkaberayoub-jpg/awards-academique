import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  adminApi,
  type CategoryResponse,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
} from '@/api/admin';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchInput } from '@/components/admin/SearchInput';
import { getApiErrorMessage } from '@/lib/apiError';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(150, 'Le nom ne doit pas dépasser 150 caractères'),
  slug: z.string().trim().max(150, 'Le slug ne doit pas dépasser 150 caractères'),
  iconUrl: z.union([z.literal(''), z.string().url('Saisissez une URL valide')]),
  parentId: z.string(),
  displayOrder: z.number().int('L\'ordre doit être un nombre entier').min(0, 'L\'ordre ne peut pas être négatif'),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const emptyCategory: CategoryFormValues = {
  name: '',
  slug: '',
  iconUrl: '',
  parentId: '',
  displayOrder: 0,
  isActive: true,
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategory,
  });

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getCategories();
      setCategories(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les catégories.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      [category.name, category.slug].some((value) => value.toLowerCase().includes(query))
    );
  }, [categories, search]);

  const parentOptions = useMemo(
    () => categories
      .filter((category) => category.id !== editingCategory?.id)
      .map((category) => ({ value: category.id, label: category.name })),
    [categories, editingCategory?.id]
  );

  function openCreateForm() {
    setEditingCategory(null);
    reset(emptyCategory);
    setIsFormOpen(true);
  }

  function openEditForm(category: CategoryResponse) {
    setEditingCategory(category);
    reset({
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl ?? '',
      parentId: category.parentId ?? '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    setIsFormOpen(true);
  }

  async function saveCategory(values: CategoryFormValues) {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const sharedPayload = {
      name: values.name,
      slug: values.slug || undefined,
      iconUrl: values.iconUrl || undefined,
      displayOrder: values.displayOrder,
    };

    try {
      if (editingCategory) {
        const payload: UpdateCategoryRequest = {
          ...sharedPayload,
          iconUrl: values.iconUrl,
          parentId: values.parentId || undefined,
          clearParent: !values.parentId && Boolean(editingCategory.parentId),
          isActive: values.isActive,
        };
        await adminApi.updateCategory(editingCategory.id, payload);
      } else {
        const payload: CreateCategoryRequest = {
          ...sharedPayload,
          parentId: values.parentId || undefined,
        };
        await adminApi.createCategory(payload);
      }

      setIsFormOpen(false);
      setSuccessMessage(`Catégorie ${editingCategory ? 'modifiée' : 'créée'} avec succès.`);
      await loadCategories();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Impossible de ${editingCategory ? 'modifier' : 'créer'} la catégorie.`));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await adminApi.deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Catégorie supprimée avec succès.');
      await loadCategories();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer la catégorie.'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function toggleActive(category: CategoryResponse) {
    setIsTogglingActive(category.id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      if (category.isActive) {
        await adminApi.deactivateCategory(category.id);
        setSuccessMessage(`Catégorie « ${category.name} » désactivée.`);
      } else {
        await adminApi.activateCategory(category.id);
        setSuccessMessage(`Catégorie « ${category.name} » activée.`);
      }
      await loadCategories();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de modifier le statut de la catégorie.'));
    } finally {
      setIsTogglingActive(null);
    }
  }

  const columns: DataTableColumn<CategoryResponse>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: (category) => (
        <div>
          <p className="font-medium text-text-primary">{category.name}</p>
          <p className="text-xs text-text-secondary">{category.slug}</p>
        </div>
      ),
    },
    {
      key: 'parent',
      header: 'Parente',
      render: (category) => {
        const parent = category.parentId ? categoryById.get(category.parentId) : null;
        return <span className="text-text-secondary">{parent?.name ?? '—'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Statut',
      render: (category) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            category.isActive
              ? 'bg-success-tint text-success'
              : 'bg-surface-secondary text-text-muted'
          }`}
        >
          {category.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Créée le',
      render: (category) => (
        <span className="text-text-secondary">{formatDate(category.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-36',
      render: (category) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditForm(category)}
            className="rounded-sm p-1.5 text-primary hover:bg-primary-tint"
            aria-label={`Modifier ${category.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void toggleActive(category)}
            disabled={isTogglingActive === category.id}
            className="rounded-sm p-1.5 text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={category.isActive ? `Désactiver ${category.name}` : `Activer ${category.name}`}
          >
            {category.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(category)}
            className="rounded-sm p-1.5 text-error hover:bg-error-tint"
            aria-label={`Supprimer ${category.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Catégories"
        description="Créez et gérez les catégories de cours."
        action={
          <button type="button" onClick={openCreateForm} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Plus className="h-4 w-4" />
            Ajouter une catégorie
          </button>
        }
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une catégorie..." />
      </div>
      {isLoading ? (
        <Loading label="Chargement des catégories..." />
      ) : filteredCategories.length === 0 ? (
        <EmptyState title={search ? 'Aucune catégorie trouvée' : 'Aucune catégorie pour le moment'} description={search ? 'Essayez une autre recherche.' : 'Ajoutez votre première catégorie pour commencer.'} />
      ) : (
        <DataTable columns={columns} data={filteredCategories} getRowKey={(category) => category.id} />
      )}

      {isFormOpen && (
        <Modal title={editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'} onClose={() => setIsFormOpen(false)}>
          <form className="space-y-4" noValidate onSubmit={handleSubmit(saveCategory)}>
            <FormInput id="category-name" label="Nom" error={errors.name?.message} {...register('name')} />
            <FormInput id="category-slug" label="Slug (facultatif)" error={errors.slug?.message} {...register('slug')} />
            <FormInput id="category-icon" label="URL de l'icône (facultatif)" type="url" error={errors.iconUrl?.message} {...register('iconUrl')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect id="category-parent" label="Catégorie parente" placeholder="Aucune" options={parentOptions} error={errors.parentId?.message} {...register('parentId')} />
              <FormInput id="category-order" label="Ordre d'affichage" type="number" min="0" error={errors.displayOrder?.message} {...register('displayOrder', { valueAsNumber: true })} />
            </div>
            {editingCategory && (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20" {...register('isActive')} />
                Catégorie active
              </label>
            )}
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
              <button type="submit" disabled={isSaving} className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Enregistrement...' : 'Enregistrer la catégorie'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && <DeleteModal itemName={deleteTarget.name} isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteCategory()} />}
    </div>
  );
}
