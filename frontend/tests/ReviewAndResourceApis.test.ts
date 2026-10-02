import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../src/api/client';
import { reviewApi } from '../src/api/reviews';
import { lessonResourcesApi } from '../src/api/resources';

vi.mock('../src/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPut = vi.mocked(apiClient.put);
const mockedDelete = vi.mocked(apiClient.delete);

const file = new File(['abc'], 'lesson.pdf', { type: 'application/pdf' });

describe('reviewApi (student write) contracts', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
  });

  it('create posts to /reviews with courseId/rating/comment', async () => {
    await reviewApi.create('c-1', 4, 'Très bon cours');
    expect(mockedPost).toHaveBeenCalledWith('/reviews', {
      courseId: 'c-1',
      rating: 4,
      comment: 'Très bon cours',
    });
  });

  it('create omits a blank comment', async () => {
    await reviewApi.create('c-1', 5, '   ');
    expect(mockedPost).toHaveBeenCalledWith('/reviews', { courseId: 'c-1', rating: 5, comment: undefined });
  });

  it('update puts to /reviews/{id} with partial payload', async () => {
    await reviewApi.update('r-1', { rating: 5 });
    expect(mockedPut).toHaveBeenCalledWith('/reviews/r-1', { rating: 5 });
  });

  it('remove deletes /reviews/{id}', async () => {
    await reviewApi.remove('r-1');
    expect(mockedDelete).toHaveBeenCalledWith('/reviews/r-1');
  });

  it('getByCourse and getMine hit the public-ish read endpoints', async () => {
    await reviewApi.getByCourse('c-1');
    expect(mockedGet).toHaveBeenCalledWith('/reviews/course/c-1');
    await reviewApi.getMine();
    expect(mockedGet).toHaveBeenCalledWith('/reviews/mine');
  });

  it('getAll hits the admin moderation endpoint', async () => {
    await reviewApi.getAll();
    expect(mockedGet).toHaveBeenCalledWith('/reviews');
  });

  it('update can carry a moderation status (administrator only)', async () => {
    await reviewApi.update('r-1', { status: 'hidden' });
    expect(mockedPut).toHaveBeenCalledWith('/reviews/r-1', { status: 'hidden' });
  });
});

describe('lessonResourcesApi (instructor write) contracts', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
  });

  it('create posts to /lesson-resources with the link payload', async () => {
    await lessonResourcesApi.create({
      lessonId: 'l-1',
      title: 'Fiche PDF',
      resourceType: 'pdf',
      url: 'https://example.com/fiche.pdf',
    });
    expect(mockedPost).toHaveBeenCalledWith('/lesson-resources', {
      lessonId: 'l-1',
      title: 'Fiche PDF',
      resourceType: 'pdf',
      url: 'https://example.com/fiche.pdf',
    });
  });

  it('upload posts multipart form-data to /lesson-resources/upload', async () => {
    await lessonResourcesApi.upload('l-1', 'Fiche PDF', file);
    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe('/lesson-resources/upload');
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect(form.get('lessonId')).toBe('l-1');
    expect(form.get('title')).toBe('Fiche PDF');
    expect(form.get('file')).toBe(file);
  });

  it('update puts to /lesson-resources/{id} with title/url only', async () => {
    await lessonResourcesApi.update('res-1', { title: 'Nouveau titre', url: 'https://example.com/new' });
    expect(mockedPut).toHaveBeenCalledWith('/lesson-resources/res-1', {
      title: 'Nouveau titre',
      url: 'https://example.com/new',
    });
  });

  it('remove deletes /lesson-resources/{id}', async () => {
    await lessonResourcesApi.remove('res-1');
    expect(mockedDelete).toHaveBeenCalledWith('/lesson-resources/res-1');
  });

  it('getByCourse hits the instructor read endpoint', async () => {
    await lessonResourcesApi.getByCourse('c-1');
    expect(mockedGet).toHaveBeenCalledWith('/lesson-resources/course/c-1');
  });
});