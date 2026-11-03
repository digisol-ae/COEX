import { cookies } from 'next/headers';
import { ResourcePdfPreview } from '@/modules/resources/pdf-preview';
import { Card, CardSection, Notice } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { publicShare, publicResources, verifiedShare } from '@/modules/resources/service';
import { resourceCookie } from '@/modules/resources/http';
import { previewable } from '@/modules/resources/rules';
import { parseVideoLink } from '@/modules/tutorials/video-link';
import { ResourceAccessForm } from './access-form';
export const dynamic = 'force-dynamic';
export default async function SharedResourcesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await publicShare(token);
  const cookie = share
    ? (await cookies()).get(resourceCookie(String(share._id)))?.value
    : undefined;
  const verified = share ? await verifiedShare(token, cookie) : null;
  const data = verified ? await publicResources(token, cookie) : null;
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-10">
      <BrandLogo />
      {!share ? (
        <Card>
          <CardSection title="Resource link unavailable">
            <p>
              This link has expired or access has been revoked. Please contact the person who shared
              it.
            </p>
          </CardSection>
        </Card>
      ) : !data ? (
        <Card>
          <CardSection title="Resources shared with you">
            <p className="mb-5 text-sm">
              Verify the code from your email to view these resources. No account or sign-in is
              required.
            </p>
            <ResourceAccessForm token={token} />
            <p className="mt-5 text-xs text-[var(--color-ink-muted)]">
              Access expires {share.expiresAt.toISOString().replace('T', ' ').slice(0, 16)} UTC.
            </p>
          </CardSection>
        </Card>
      ) : (
        <>
          <h1 className="break-words text-2xl font-semibold">{share.title}</h1>
          {share.message ? <p className="whitespace-pre-wrap">{share.message}</p> : null}
          <Notice>
            Access expires {share.expiresAt.toISOString().replace('T', ' ').slice(0, 16)} UTC. This
            browser remains verified until then.
          </Notice>
          {data.resources.length === 0 ? (
            <Notice>These resources are no longer available. Please contact the sender.</Notice>
          ) : null}
          {data.resources.map((resource) => {
            const id = String(resource.resourceId);
            const fileUrl = `/shared/resources/${token}/files/${id}`;
            const video = resource.videoUrl ? parseVideoLink(resource.videoUrl) : null;
            return (
              <Card key={id}>
                <CardSection title={resource.title}>
                  {resource.description ? (
                    <p className="mb-3 whitespace-pre-wrap text-sm">{resource.description}</p>
                  ) : null}
                  {resource.kind === 'video' && video ? (
                    <div className="space-y-3">
                      {video.embed ? (
                        <iframe
                          src={video.url}
                          title={resource.title}
                          referrerPolicy="no-referrer"
                          allow="fullscreen; picture-in-picture"
                          allowFullScreen
                          className="aspect-video w-full rounded-lg"
                        />
                      ) : (
                        <video src={video.url} controls preload="none" className="w-full" />
                      )}
                      <a
                        href={resource.videoUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="text-sm underline"
                      >
                        Open video
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        {previewable(resource.contentType ?? '') ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            View document
                          </a>
                        ) : null}
                        <a href={`${fileUrl}?download=1`} className="break-all underline">
                          Download {resource.fileName}
                        </a>
                      </div>
                      {resource.contentType === 'application/pdf' ? (
                        <ResourcePdfPreview
                          url={fileUrl}
                          title={resource.title}
                          autoOpen={data.resources.length === 1}
                        />
                      ) : null}
                    </div>
                  )}
                </CardSection>
              </Card>
            );
          })}
        </>
      )}
      <p className="text-xs text-[var(--color-ink-muted)]">
        Shared securely through Worktello · Powered by DigiSol
      </p>
    </main>
  );
}
