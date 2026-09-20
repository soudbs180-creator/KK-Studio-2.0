const imgProperty1 = "https://www.figma.com/api/mcp/asset/28ac206a-f96a-440d-a10a-f3a97063f44c.svg";
const imgProperty2 = "https://www.figma.com/api/mcp/asset/4c04ecb6-416d-4d01-a28a-8d016ac367d5.svg";
const img201 = "https://www.figma.com/api/mcp/asset/285c2175-e393-4552-a823-858b90a80bed.svg";
const imgGroup = "https://www.figma.com/api/mcp/asset/26ca542c-f0ee-433e-992a-6a6dfe31a64f.svg";
const imgGroup1 = "https://www.figma.com/api/mcp/asset/1526f3bf-4f68-4b43-9d5a-9df68f9165af.svg";
const imgIconCopy = "https://www.figma.com/api/mcp/asset/01f1ff6c-5f56-416d-ba71-e7ab8447223c.svg";
const imgIconStar = "https://www.figma.com/api/mcp/asset/1a65f5ab-987b-46d8-ad43-ec8a68d3e998.svg";
const imgIconRefreshCw = "https://www.figma.com/api/mcp/asset/67032290-c97e-435f-b47c-15da6ec1d9c5.svg";
const imgIconEllipsis = "https://www.figma.com/api/mcp/asset/da163743-6aa4-424b-a308-aa93f5ebd95f.svg";
const imgGroup127 = "https://www.figma.com/api/mcp/asset/eba2be5e-5016-41a9-9ec1-ba1190684713.svg";
const imgGroup10 = "https://www.figma.com/api/mcp/asset/b9f3441a-48fa-4263-954c-58bcd91a2f18.svg";
const img6 = "https://www.figma.com/api/mcp/asset/8101ffd1-4118-44f1-a176-37533d4cb3c4.svg";
const imgEllipse5 = "https://www.figma.com/api/mcp/asset/3fc0cff2-1e7c-4452-8548-0c4ba749f795.svg";
const img295 = "https://www.figma.com/api/mcp/asset/b896a04c-5cf2-4fa7-bd89-3b4f66dd8e12.svg";
const img297 = "https://www.figma.com/api/mcp/asset/4d0db07f-0b77-4d54-af7d-91d179548a69.svg";
const img296 = "https://www.figma.com/api/mcp/asset/849eba68-d56a-47ad-bbea-ada3aaa49c63.svg";
const imgLine8 = "https://www.figma.com/api/mcp/asset/277d7aa5-7447-42fb-af21-93f17c80991e.svg";
const imgIconMic = "https://www.figma.com/api/mcp/asset/cbbf0e9d-26d8-43f0-b57c-f0087de24efb.svg";
const imgIconPackage = "https://www.figma.com/api/mcp/asset/45424f00-bdb3-4844-99ff-ac2c1625a710.svg";
const imgLine7 = "https://www.figma.com/api/mcp/asset/1eab3fc6-a3a2-4c84-817b-1249c211a47c.svg";
const imgIconPuzzle = "https://www.figma.com/api/mcp/asset/e370a1d0-8173-4a18-8158-e2bef004f835.svg";
const imgIconUnplug = "https://www.figma.com/api/mcp/asset/9e485d7c-5a8f-4bbc-9ec6-31ff4b3096a6.svg";

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

type ComponentProps = {
  className?: string;
  property1?: "右打开";
};

function Component({ className, property1 = "右打开" }: ComponentProps) {
  return (
    <button className={className || "block relative size-[18px]"} data-node-id="121:17653">
      <div className="absolute inset-[-9.72%]">
        <img alt="" className="block max-w-none size-full" src={imgProperty2} />
      </div>
    </button>
  );
}

export default function Component2() {
  return (
    <div className="contents relative size-full" data-node-id="1:8090" data-name="右边侧边栏">
      <div className="absolute contents left-[1429px] top-[56px]" data-node-id="71:15668" data-name="背景框">
        <div className="absolute bg-[#161616] border border-[#3c3c3c] border-solid h-[1003px] left-[1431px] rounded-[20px] top-[56px] w-[470px]" data-node-id="4:5" />
        <div className="absolute bg-[#3c3c3c] h-[30px] left-[1429px] rounded-[4px] top-[540px] w-[4px]" data-node-id="4:18" />
      </div>
      <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[1611px] not-italic text-[#4b4b4b] text-[10px] top-[1035px] whitespace-nowrap" data-node-id="21:111812">
        请确保不侵权，合法使用
      </p>
      <div className="absolute contents left-[1451px] top-[73px]" data-node-id="71:15667" data-name="顶部信息">
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
      <div className="absolute contents left-[1451px] top-[129px]" data-node-id="71:15666" data-name="聊天组件">
        <div className="absolute contents left-[1451px] top-[429px]" data-node-id="312:2708" data-name="AI回复">
          <p className="[word-break:break-word] absolute font-['Inter:Light'] font-light inset-[39.72%_15.78%_58.15%_76.46%] leading-[normal] not-italic text-[#dadada] text-[10px]" data-node-id="23:127648">
            正在处理中....
          </p>
          <div className="absolute left-[1451px] opacity-50 overflow-clip size-[11px] top-[429px]" data-node-id="23:127637" data-name="kk-studio 6">
            <div className="absolute contents inset-0" data-node-id="23:127638" data-name="Clip path group">
              <div className="absolute inset-[7.1%_9.16%_-32.5%_9.16%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-1.008px_-0.781px] mask-size-[11px_11px]" data-node-id="23:127641" style={{ maskImage: `url("${imgGroup}")` }} data-name="Group">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal h-[120px] leading-[normal] not-italic right-[469px] text-[#d1d2d8] text-[12px] top-[459px] translate-x-full w-[430px]" data-node-id="94:16104">
            21:9 超宽横版，超写实电商套装产品摄影。画面参考专业电动工具“整套配件展示”的构图，但所有产品必须严格使用参考图中的 KIMO 20V 黑绿色电动工具套装。场景是一块非常干净、平整的暖白色展示台面，放置在浅色木质家居或木工作业空间中。背景只隐约出现浅色木板、木质结构和少量空间层次，背景轻微虚化，不出现杂乱工具、木屑、油污或施工垃圾。整体环境明亮、自然、高级，像真实拍摄的 Amazon 电商套装副图。镜头采用前上方约 35°轻微俯拍，不是完全正俯视。所有产品真实平放在同一个台面上，保持统一透视和真实接触阴影。
          </p>
          <div className="absolute content-stretch flex gap-[11px] items-center left-[1451px] top-[598px]" data-node-id="312:2705">
            <div className="relative shrink-0 size-[12.774px]" data-node-id="94:16105" data-name="icon-copy">
              <div className="absolute inset-[-3.91%]">
                <img alt="" className="block max-w-none size-full" src={imgIconCopy} />
              </div>
            </div>
            <div className="h-[12.178px] relative shrink-0 w-[12.773px]" data-node-id="94:16117" data-name="icon-star">
              <div className="absolute inset-[-4.11%_-3.91%]">
                <img alt="" className="block max-w-none size-full" src={imgIconStar} />
              </div>
            </div>
            <div className="relative shrink-0 size-[11.496px]" data-node-id="94:16108" data-name="icon-refresh-cw">
              <div className="absolute inset-[-4.35%]">
                <img alt="" className="block max-w-none size-full" src={imgIconRefreshCw} />
              </div>
            </div>
            <div className="h-[1.277px] relative shrink-0 w-[10.219px]" data-node-id="94:16113" data-name="icon-ellipsis">
              <div className="absolute inset-[-39.14%_-4.89%]">
                <img alt="" className="block max-w-none size-full" src={imgIconEllipsis} />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute contents left-[1451px] top-[129px]" data-node-id="312:2709" data-name="我方对话">
          <div className="absolute bg-[#1f1f1f] border border-[#3c3c3c] border-solid h-[160px] left-[1451px] rounded-[20px] top-[242px] w-[431px]" data-node-id="23:127665" />
          <div className="absolute bg-[#1f1f1f] border border-[#3c3c3c] border-solid h-[102px] left-[1793px] rounded-[20px] top-[129px] w-[89px]" data-node-id="23:127678" />
          <div className="absolute inset-[37.85%_3.02%_60.94%_95.15%]" data-node-id="312:2706">
            <div className="absolute inset-[-3.85%_-1.42%]">
              <img alt="" className="block max-w-none size-full" src={imgGroup127} />
            </div>
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal h-[120px] leading-[normal] not-italic right-[446px] text-[#d1d2d8] text-[12px] top-[262px] translate-x-full w-[384px]" data-node-id="23:127666">
            21:9 超宽横版，超写实电商套装产品摄影。画面参考专业电动工具“整套配件展示”的构图，但所有产品必须严格使用参考图中的 KIMO 20V 黑绿色电动工具套装。场景是一块非常干净、平整的暖白色展示台面，放置在浅色木质家居或木工作业空间中。背景只隐约出现浅色木板、木质结构和少量空间层次，背景轻微虚化，不出现杂乱工具、木屑、油污或施工垃圾。整体环境明亮、自然、高级，像真实拍摄的 Amazon 电商套装副图。镜头采用前上方约 35°轻微俯拍，不是完全正俯视。所有产品真实平放在同一个台面上，保持统一透视和真实接触阴影。
          </p>
          <div className="absolute inset-[15.74%_3.75%_82.41%_95.21%]" data-node-id="23:127772">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup10} />
          </div>
        </div>
        <div className="absolute contents left-[1451px] top-[855px]" data-node-id="71:15665" data-name="输入框">
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
