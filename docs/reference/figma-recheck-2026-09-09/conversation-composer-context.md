const imgProperty1 = "https://www.figma.com/api/mcp/asset/b8fbacac-6dd1-476f-826d-2dd22a310e5b.svg";
const img6 = "https://www.figma.com/api/mcp/asset/5a560612-5ee0-45d4-8391-323d526a6e61.svg";
const imgEllipse5 = "https://www.figma.com/api/mcp/asset/9f536db8-6143-441c-895d-b81380185c2f.svg";
const img295 = "https://www.figma.com/api/mcp/asset/2c3274ef-a0f2-4134-aba2-4df268c30837.svg";
const img297 = "https://www.figma.com/api/mcp/asset/6d652b42-03b0-4468-ab71-c88740d98eea.svg";
const img296 = "https://www.figma.com/api/mcp/asset/f20d18fc-0059-4d1d-9643-7fa63032d1ce.svg";
const imgLine8 = "https://www.figma.com/api/mcp/asset/5b6c0433-68e7-4eb6-87d4-aa1c8eb42b76.svg";
const imgIconMic = "https://www.figma.com/api/mcp/asset/59f4f783-9537-4a4c-8b12-b28a9ad1de04.svg";
const imgIconPackage = "https://www.figma.com/api/mcp/asset/b91bfa1b-109a-43b6-bf82-9429d275818a.svg";
const imgLine7 = "https://www.figma.com/api/mcp/asset/9a0e11b1-80af-4345-b8f3-deb13b524d85.svg";
const imgIconPuzzle = "https://www.figma.com/api/mcp/asset/81a5adfb-4849-4aa5-aac1-775df043f9a5.svg";
const imgIconUnplug = "https://www.figma.com/api/mcp/asset/cc7a3b66-8a8c-481d-bcd6-33c6a0389cc8.svg";

type Component1Props = {
  className?: string;
  property1?: "发送";
};

function Component1({ className, property1 = "发送" }: Component1Props) {
  return (
    <button className={className || "block relative size-[24px]"} data-node-id="94:16089">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgProperty1} />
    </button>
  );
}

export default function Component() {
  return (
    <div className="contents relative size-full" data-node-id="71:15665" data-name="输入框">
      <div className="absolute h-[170px] left-[1451px] top-[855px] w-[430px]" data-node-id="1:7216" data-name="矩形 6">
        <div className="absolute inset-[-0.29%_-0.12%]">
          <img alt="" className="block max-w-none size-full" src={img6} />
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[1465px] not-italic text-[#4b4b4b] text-[14px] top-[871px] whitespace-nowrap" data-node-id="21:119283">
        描述你想要生成的内容
      </p>
      <div className="absolute contents left-[1465px] top-[987px]" data-node-id="71:15664" data-name="输入框底部栏">
        <div className="absolute left-[1465px] size-[24px] top-[987px]" data-node-id="21:119277">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse5} />
        </div>
        <Component1 className="absolute block cursor-pointer left-[1844px] size-[24px] top-[987px]" />
        <div className="absolute bg-[#252525] h-[24px] left-[1780px] rounded-[12px] top-[987px] w-[58px]" data-node-id="21:111832" />
        <p className="[word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[1790px] not-italic text-[#707070] text-[12px] top-[992px] whitespace-nowrap" data-node-id="21:119262">
          自动
        </p>
        <div className="-translate-y-1/2 absolute aspect-[12/6] left-[94.69%] right-[4.79%] top-[calc(50%+459.5px)]" data-node-id="21:119263" data-name="路径 295">
          <div className="absolute inset-[-10%_-5%]">
            <img alt="" className="block max-w-none size-full" src={img295} />
          </div>
        </div>
        <div className="absolute flex inset-[91.94%_22.76%_6.94%_76.61%] items-center justify-center" data-node-id="21:119278" style={{ containerType: "size" }}>
          <div className="flex-none h-[hypot(-50cqw,50cqh)] rotate-45 w-[hypot(50cqw,50cqh)]">
            <div className="relative size-full" data-name="路径 297">
              <div className="absolute inset-[-10.31%]">
                <img alt="" className="block max-w-none size-full" src={img297} />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute flex inset-[91.94%_22.76%_6.94%_76.61%] items-center justify-center" data-node-id="21:119279" style={{ containerType: "size" }}>
          <div className="flex-none h-[hypot(-50cqw,50cqh)] rotate-45 w-[hypot(50cqw,50cqh)]">
            <div className="relative size-full" data-name="路径 296">
              <div className="absolute inset-[-10.31%]">
                <img alt="" className="block max-w-none size-full" src={img296} />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute flex h-[16px] items-center justify-center left-[1773px] top-[991px] w-0" data-node-id="21:119296">
          <div className="flex-none rotate-90">
            <div className="h-0 relative w-[16px]">
              <div className="absolute inset-[-1px_0_0_0]">
                <img alt="" className="block max-w-none size-full" src={imgLine8} />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-[91.85%_8.07%_6.83%_91.41%]" data-node-id="21:119291" data-name="icon-mic">
          <div className="absolute inset-[-3.5%_-5%]">
            <img alt="" className="block max-w-none size-full" src={imgIconMic} />
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[5px] items-center left-[1493px] top-[987px]" data-node-id="133:17947">
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="133:17944">
            <div className="bg-[#252525] col-1 h-[24px] ml-0 mt-0 relative rounded-[12px] row-1 w-[58px]" data-node-id="21:119267" />
            <p className="[word-break:break-word] col-1 font-['Inter:Medium'] font-medium leading-[normal] ml-[24px] mt-[5px] not-italic relative row-1 text-[#707070] text-[12px] whitespace-nowrap" data-node-id="21:119268">
              模型
            </p>
            <div className="col-1 h-[13.849px] ml-[8px] mt-[5px] relative row-1 w-[12.465px]" data-node-id="21:119269" data-name="icon-package">
              <div className="absolute inset-[-3.61%_-4.01%]">
                <img alt="" className="block max-w-none size-full" src={imgIconPackage} />
              </div>
            </div>
          </div>
          <div className="flex h-[16px] items-center justify-center relative shrink-0 w-0" data-node-id="21:119281">
            <div className="flex-none rotate-90">
              <div className="h-0 relative w-[16px]">
                <div className="absolute inset-[-1px_0_0_0]">
                  <img alt="" className="block max-w-none size-full" src={imgLine7} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="133:17945">
            <div className="bg-[#252525] col-1 h-[24px] ml-0 mt-0 relative rounded-[12px] row-1 w-[58px]" data-node-id="21:119265" />
            <p className="[word-break:break-word] col-1 font-['Inter:Medium'] font-medium leading-[normal] ml-[25px] mt-[6px] not-italic relative row-1 text-[#707070] text-[12px] whitespace-nowrap" data-node-id="21:119266">
              Skill
            </p>
            <div className="col-1 ml-[10px] mt-[6px] relative row-1 size-[12px]" data-node-id="21:119274" data-name="icon-puzzle">
              <div className="absolute inset-[-4.17%]">
                <img alt="" className="block max-w-none size-full" src={imgIconPuzzle} />
              </div>
            </div>
          </div>
          <div className="flex h-[16px] items-center justify-center relative shrink-0 w-0" data-node-id="23:127780">
            <div className="flex-none rotate-90">
              <div className="h-0 relative w-[16px]">
                <div className="absolute inset-[-1px_0_0_0]">
                  <img alt="" className="block max-w-none size-full" src={imgLine7} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="133:17946">
            <div className="bg-[#252525] col-1 h-[24px] ml-0 mt-0 relative rounded-[12px] row-1 w-[58px]" data-node-id="23:127776" />
            <p className="[word-break:break-word] col-1 font-['Inter:Medium'] font-medium leading-[normal] ml-[25px] mt-[5px] not-italic relative row-1 text-[#707070] text-[12px] whitespace-nowrap" data-node-id="23:127777">
              插件
            </p>
            <div className="col-1 ml-[9px] mt-[5.5px] relative row-1 size-[12px]" data-node-id="23:127781" data-name="icon-unplug">
              <div className="absolute inset-[-4.17%]">
                <img alt="" className="block max-w-none size-full" src={imgIconUnplug} />
              </div>
            </div>
          </div>
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
