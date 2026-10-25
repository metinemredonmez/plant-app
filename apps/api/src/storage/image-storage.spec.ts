import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';

import { R2ImageStorage } from './image-storage.js';

const PUBLIC_ID = '7f1c2b4e-0000-4000-8000-000000000000';

function storage(pages: { keys: string[]; next?: string }[] = []) {
  const send = vi.fn(async (command: unknown) => {
    if (command instanceof ListObjectsV2Command) {
      const page = pages.shift() ?? { keys: [] };
      return {
        Contents: page.keys.map((Key) => ({ Key })),
        IsTruncated: page.next !== undefined,
        NextContinuationToken: page.next,
      };
    }
    return {};
  });
  const client = { send } as unknown as S3Client;
  return { r2: new R2ImageStorage('everbloom-scans', client), send };
}

describe('R2ImageStorage', () => {
  it('puts the photo under the user’s folder with its type', async () => {
    const { r2, send } = storage();
    const key = await r2.put(PUBLIC_ID, Buffer.from('jpeg'), 'image/jpeg');

    expect(key).toMatch(new RegExp(`^scans/${PUBLIC_ID}/[0-9a-f-]{36}\\.jpg$`));
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'everbloom-scans',
      Key: key,
      ContentType: 'image/jpeg',
    });
  });

  it('deletes every page of the user’s photos and nothing else', async () => {
    const { r2, send } = storage([
      {
        keys: [`scans/${PUBLIC_ID}/a.jpg`, `scans/${PUBLIC_ID}/b.jpg`],
        next: 't2',
      },
      { keys: [`scans/${PUBLIC_ID}/c.jpg`] },
    ]);
    await r2.removeAll(PUBLIC_ID);

    const commands = send.mock.calls.map(([command]) => command);
    const lists = commands.filter((c) => c instanceof ListObjectsV2Command);
    const deletes = commands.filter((c) => c instanceof DeleteObjectsCommand);
    expect(lists.map((c) => c.input)).toEqual([
      expect.objectContaining({
        Prefix: `scans/${PUBLIC_ID}/`,
        ContinuationToken: undefined,
      }),
      expect.objectContaining({
        Prefix: `scans/${PUBLIC_ID}/`,
        ContinuationToken: 't2',
      }),
    ]);
    expect(deletes.map((c) => c.input.Delete?.Objects)).toEqual([
      [
        { Key: `scans/${PUBLIC_ID}/a.jpg` },
        { Key: `scans/${PUBLIC_ID}/b.jpg` },
      ],
      [{ Key: `scans/${PUBLIC_ID}/c.jpg` }],
    ]);
  });

  it('sends no delete when the user has no photos', async () => {
    const { r2, send } = storage([{ keys: [] }]);
    await r2.removeAll(PUBLIC_ID);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
