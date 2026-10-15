import { ChatAssistantEditor } from "@/components/chat/chat-assistant-editor";
import { VendorShell } from "@/components/layout/vendor-shell";
import { StoreSectionNav } from "@/components/stores/store-section-nav";
import { prisma } from "@/lib/prisma";
import { defaultChatConfig } from "@/modules/chat/config";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Assistant WhatsApp" };

export default async function ChatAssistantPage() {
  const { store } = await requireStorePermission("store.manage");
  const [config, replies] = await Promise.all([
    prisma.storeChatConfig.findUnique({ where: { storeId: store.id } }),
    prisma.storeChatQuickReply.findMany({ where: { storeId: store.id }, orderBy: { position: "asc" } }),
  ]);

  return (
    <VendorShell>
      <StoreSectionNav current="/dashboard/boutique/assistant" />
      <ChatAssistantEditor
        initial={
          config
            ? {
                enabled: config.enabled,
                welcomeMessage: config.welcomeMessage,
                transferTemplate: config.transferTemplate,
                offHoursMessage: config.offHoursMessage ?? "",
                showOnHome: config.showOnHome,
                showOnProduct: config.showOnProduct,
                showOnCart: config.showOnCart,
                showOnCheckout: config.showOnCheckout,
                quickReplies: replies.map(({ label, answer, enabled }) => ({ label, answer, enabled })),
              }
            : defaultChatConfig
        }
        storeName={store.name}
        storeSlug={store.slug}
      />
    </VendorShell>
  );
}
