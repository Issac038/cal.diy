import { _generateMetadataForStaticPage } from "app/_utils";
import type { Metadata } from "next";

import { BorderRadiusTable } from "@calcom/web/components/ui/BorderRadiusTable";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return await _generateMetadataForStaticPage(
    "Border Radius",
    "",
    undefined,
    undefined,
    "/design/border-radius"
  );
}

export default function BorderRadiusPage() {
  return (
    <div className="bg-subtle flex min-h-screen">
      <div className="bg-default m-auto min-w-full rounded-md p-10">
        <h1 className="text-emphasis font-cal text-2xl font-medium">Border Radius</h1>
        <p className="text-subtle mt-1 text-sm">
          Click a card, or focus it with Tab and press Enter, to copy its Tailwind class name.
        </p>
        <div className="mt-6">
          <BorderRadiusTable />
        </div>
      </div>
    </div>
  );
}
