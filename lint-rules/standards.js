// Two rules from CODING_STANDARDS.md that a parser can check, so the reviewer
// agent no longer has to.

// "Parse untrusted input with a schema, at the edge": Number("") is 0, so an
// empty route param or form field turns into a real id. Coerce through zod.
const isUntrustedInput = (node) => {
  if (node.type === "MemberExpression") {
    return node.object.type === "Identifier" && node.object.name === "params";
  }
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type !== "MemberExpression" || callee.property.name !== "get") {
    return false;
  }
  const source = callee.object;
  if (source.type === "Identifier") {
    return ["formData", "searchParams"].includes(source.name);
  }
  return (
    source.type === "MemberExpression" &&
    source.property.name === "searchParams"
  );
};

const noNumberOfInput = {
  meta: {
    type: "problem",
    messages: {
      coerce:
        'Number() of request input turns "" into 0. Parse it with a zod schema (z.coerce.number().int().positive()). See CODING_STANDARDS.md, "Parse untrusted input with a schema, at the edge".',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "Number")
          return;
        const [arg] = node.arguments;
        if (arg && isUntrustedInput(arg)) {
          context.report({ node, messageId: "coerce" });
        }
      },
    };
  },
};

// "Inject the clock": a function that reads the time itself cannot be tested
// at a fixed moment. Enabled for app/lib and app/modules in .oxlintrc.json.
const injectClock = {
  meta: {
    type: "problem",
    messages: {
      clock:
        'Take the time as an argument (now: Date) instead of reading the clock here. See CODING_STANDARDS.md, "Inject the clock".',
    },
  },
  create(context) {
    const isDate = (node) => node.type === "Identifier" && node.name === "Date";
    return {
      NewExpression(node) {
        if (isDate(node.callee) && node.arguments.length === 0) {
          context.report({ node, messageId: "clock" });
        }
      },
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === "MemberExpression" &&
          isDate(callee.object) &&
          callee.property.name === "now"
        ) {
          context.report({ node, messageId: "clock" });
        }
      },
    };
  },
};

export default {
  meta: { name: "standards" },
  rules: {
    "no-number-of-input": noNumberOfInput,
    "inject-clock": injectClock,
  },
};
