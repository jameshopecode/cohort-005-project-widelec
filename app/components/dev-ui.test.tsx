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
  // vitest runs with import.meta.env.DEV true, so the dev-only button renders.
  it("puts Send feedback in the panel's footer, after the panel body", () => {
    const markup = renderPanel();
    const footer = markup.match(/<footer[^>]*>([\s\S]*?)<\/footer>/);

    expect(footer?.[1] ?? "no <footer> in the panel").toContain(
      "Send feedback"
    );
    expect(markup.indexOf("<footer")).toBeGreaterThan(
      markup.indexOf("PPP Country")
    );
  });
});
