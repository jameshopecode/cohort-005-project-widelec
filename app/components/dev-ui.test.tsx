import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { DevUI } from "~/components/dev-ui";

function renderPanel() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <DevUI
          users={[]}
          currentUser={null}
          devCountry={null}
          countryTierInfo={{ tier: 1, discount: 0, label: "Full price" }}
          countries={[]}
        />
      ),
    },
  ]);
  return renderToStaticMarkup(<Stub initialEntries={["/"]} />);
}

describe("DevUI panel", () => {
  it("puts Send feedback in a footer strip after the panel body, not in a section of its own", () => {
    const markup = renderPanel();
    const afterCountry = markup.slice(markup.indexOf("PPP Country"));
    const footerStart = afterCountry.indexOf(
      '<div class="border-t border-dashed px-3 py-2">'
    );

    expect(footerStart).toBeGreaterThan(-1);
    expect(afterCountry.indexOf("Send feedback")).toBeGreaterThan(footerStart);
  });
});
