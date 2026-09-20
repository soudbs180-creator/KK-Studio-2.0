const imgProperty1 = "https://www.figma.com/api/mcp/asset/892c920c-6993-4f7e-869d-6ce9c73c74a2.svg";
const img201 = "https://www.figma.com/api/mcp/asset/68096c40-96a9-4827-968d-b3755fc9957a.svg";

type ComponentProps = {
  className?: string;
  property1?: "右打开";
};

function Component({ className, property1 = "右打开" }: ComponentProps) {
  return (
    <button className={className || "block relative size-[18px]"} data-node-id="121:17653">
      <div className="absolute inset-[-9.72%]">
        <img alt="" className="block max-w-none size-full" src={imgProperty1} />
      </div>
    </button>
  );
}

export default function Component1() {
  return (
    <div className="contents relative size-full" data-node-id="71:15667" data-name="顶部信息">
      <p className="[word-break:break-word] absolute font-['Inter:Bold'] font-bold inset-[6.85%_16.67%_91.02%_75.57%] leading-[normal] not-italic text-[#dadada] text-[16px]" data-node-id="21:119284">
        新建对话
      </p>
      <Component className="absolute block cursor-pointer left-[1859px] size-[18px] top-[74px]" />
      <div className="absolute inset-[6.76%_4.37%_91.39%_94.58%]" data-node-id="21:119305" data-name="路径 201">
        <div className="absolute inset-[-4.37%]">
          <img alt="" className="block max-w-none size-full" src={img201} />
        </div>
      </div>
    </div>
  );
}

SUPER CRITICAL: The generated React+Tailwind code MUST be converted to match the target project's technology stack and styling system.
1. Analyze the target codebase to identify: technology stack, styling approach, component patterns, and design tokens
2. Convert React syntax to the target framework/library
3. Transform all Tailwind classes to the target styling system while preserving exact visual design
4. Follow the project's existing patterns and conventions
DO NOT install any Tailwind as a dependency unless the user instructs you to do so.


Node ids have been added to the code as data attributes, e.g. `data-node-id="1:2"`.

Images and SVGs will be stored as constants, e.g. const image = 'https://www.figma.com/api/mcp/asset/550e8400-e29b-41d4-a716-446655440000.png'. These constants will be used in the code as the source for the image, ex: <img src={image} />. Image assets are stored on a remote server for 7 days and can be fetched using the provided URLs until they expire.
