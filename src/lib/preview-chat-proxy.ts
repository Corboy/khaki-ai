export interface PreviewWorkerService {
  fetch(request: Request): Promise<Response>;
}

export interface PreviewChatEnvironment {
  KHAKI_PREVIEW_CHAT_PROXY?: string;
  WORKER_SELF_REFERENCE?: PreviewWorkerService;
}

/** Use the production chat backend for branch previews without copying secrets. */
export async function proxyPreviewChat(
  request: Request,
  env: PreviewChatEnvironment,
): Promise<Response | null> {
  if (env.KHAKI_PREVIEW_CHAT_PROXY !== "1") return null;

  if (!env.WORKER_SELF_REFERENCE) {
    return Response.json({ error: "Preview chat backend is unavailable." }, { status: 503 });
  }

  return env.WORKER_SELF_REFERENCE.fetch(request);
}
