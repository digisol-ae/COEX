'use client';
/* eslint-disable @next/next/no-img-element -- These supplied diagram and screenshot crops require their exact intrinsic layers. */
const imgScreenshot20261120At32733Pm2 = '/website/figma/b1ea4.png';
const imgImage16 = '/website/figma/d5781.png';
const imgDark = '/website/figma/3ad0f.png';
const imgMoon = '/website/figma/48baa.svg';
const imgSun = '/website/figma/9fe46.svg';

export function HeroGraphic({
  className,
  theme,
  onToggle,
}: {
  className?: string;
  theme: 'dark' | 'light';
  onToggle: () => void;
}) {
  return (
    <div className={className || 'h-[944px] relative w-[1300.002px]'} data-node-id="121:684">
      <div className="absolute contents inset-0" data-node-id="121:682">
        <div
          className="absolute contents inset-[0_0_0.09%_0]"
          data-node-id="121:681"
          style={{ display: theme === 'light' ? 'contents' : 'none' }}
        >
          <div
            className="absolute aspect-[1388/1007] contents left-0 right-0 top-0"
            data-node-id="121:591"
          >
            <div className="absolute contents left-0 right-0 top-0" data-node-id="121:592">
              <div
                className="absolute aspect-[1087/1007] left-[21.69%] right-0 rounded-br-[22px] rounded-tr-[22px] top-0"
                data-node-id="121:593"
                data-name="Screenshot 2026-11-20 at 3.27.33 PM 2"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-br-[22px] rounded-tr-[22px]">
                  <img
                    alt=""
                    className="absolute h-full left-[-52.07%] max-w-none top-0 w-[175.07%]"
                    src={imgScreenshot20261120At32733Pm2}
                  />
                </div>
              </div>
              <div
                className="absolute aspect-[277/57] left-[80.04%] right-0 rounded-tr-[22px] top-0"
                data-node-id="121:594"
                data-name="Screenshot 2026-11-20 at 3.27.33 PM 5"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-tr-[22px]">
                  <img
                    alt=""
                    className="absolute h-[1766.67%] left-[-581.59%] max-w-none top-0 w-[687%]"
                    src={imgScreenshot20261120At32733Pm2}
                  />
                </div>
              </div>
              <div
                className="absolute aspect-[301/1007] left-0 right-[78.31%] rounded-bl-[22px] rounded-tl-[22px] top-0"
                data-node-id="121:595"
                data-name="Screenshot 2026-11-20 at 3.27.33 PM 3"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-bl-[22px] rounded-tl-[22px]">
                  <img
                    alt=""
                    className="absolute h-full left-0 max-w-none top-0 w-[632.23%]"
                    src={imgScreenshot20261120At32733Pm2}
                  />
                </div>
              </div>
              <div
                className="absolute aspect-[80/100] left-[23.05%] right-[71.18%] top-0"
                data-node-id="121:596"
                data-name="Screenshot 2026-11-20 at 3.27.33 PM 4"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    alt=""
                    className="absolute h-[1007%] left-[-395%] max-w-none top-0 w-[2378.75%]"
                    src={imgScreenshot20261120At32733Pm2}
                  />
                </div>
              </div>
            </div>
            <div
              className="absolute bg-[#fff9f4] inset-[0.4%_82.85%_94.94%_7.2%]"
              data-node-id="121:597"
            />
            <div
              className="absolute aspect-[720/287] left-[8.29%] right-[82.66%] top-[2.81px]"
              data-node-id="121:598"
              data-name="image 16"
            >
              <img
                alt=""
                className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
                src={imgImage16}
              />
            </div>
          </div>
          <div
            className="absolute bg-[#fffffe] inset-[0.95%_10.31%_95.34%_81.08%]"
            data-node-id="121:680"
            style={{ display: theme === 'light' ? 'block' : 'none' }}
          />
        </div>
        <div
          className="absolute contents inset-0"
          data-node-id="121:679"
          style={{ display: theme === 'dark' ? 'contents' : 'none' }}
        >
          <div className="absolute contents inset-0" data-node-id="121:599">
            <div className="absolute contents left-0 right-0 top-0" data-node-id="121:600">
              <div
                className="absolute aspect-[1088/1007] left-[21.58%] right-0 rounded-br-[22px] rounded-tr-[22px] top-[0.42px]"
                data-node-id="121:601"
                data-name="Dark"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-br-[22px] rounded-tr-[22px]">
                  <img
                    alt=""
                    className="absolute h-full left-[-51.93%] max-w-none top-0 w-[174.91%]"
                    src={imgDark}
                  />
                </div>
              </div>
              <div
                className="absolute aspect-[315/53] left-[77.3%] right-0 rounded-tr-[22px] top-[0.01px]"
                data-node-id="121:602"
                data-name="Dark"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-tr-[22px]">
                  <img
                    alt=""
                    className="absolute h-[1900%] left-[-499.37%] max-w-none top-0 w-[604.13%]"
                    src={imgDark}
                  />
                </div>
              </div>
              <div
                className="absolute aspect-[300/1007] left-0 right-[78.38%] rounded-bl-[22px] rounded-tl-[22px] top-[0.21px]"
                data-node-id="121:603"
                data-name="Dark"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-bl-[22px] rounded-tl-[22px]">
                  <img
                    alt=""
                    className="absolute h-full left-0 max-w-none top-0 w-[634.33%]"
                    src={imgDark}
                  />
                </div>
              </div>
              <div
                className="absolute aspect-[80/90] left-[22.98%] right-[71.25%] top-0"
                data-node-id="121:604"
                data-name="Dark"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    alt=""
                    className="absolute h-[1118.89%] left-[-393.75%] max-w-none top-0 w-[2378.75%]"
                    src={imgDark}
                  />
                </div>
              </div>
            </div>
            <div
              className="absolute bg-[#1f1b1a] inset-[0.4%_82.93%_94.94%_7.13%]"
              data-node-id="121:605"
            />
            <div
              className="absolute aspect-[720/287] left-[8.28%] right-[82.66%] top-[2.82px]"
              data-node-id="121:606"
              data-name="image 15"
            >
              <img
                alt=""
                className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
                src={imgImage16}
              />
            </div>
          </div>
          <div
            className="absolute bg-[#1a1a1b] inset-[0.74%_10.46%_95.76%_80.77%]"
            data-node-id="121:678"
          />
        </div>
      </div>
      <button
        type="button"
        aria-label={
          theme === 'dark' ? 'Show light workspace preview' : 'Show dark workspace preview'
        }
        aria-pressed={theme === 'light'}
        onClick={onToggle}
        className="absolute bg-[#141415] border-[#363636] border-[0.6px] border-solid content-stretch cursor-pointer flex gap-[2px] inset-[1.06%_10.85%_95.55%_84.38%] items-center overflow-clip p-[2px] rounded-[32px]"
        data-node-id="121:663"
        data-name="_Toggle base"
      >
        <div
          className="bg-[#fd3049] content-stretch flex items-center justify-center overflow-clip p-[2px] relative rounded-[30px] shrink-0 size-[28px]"
          data-node-id="121:664"
          data-name="_Toggle base"
        >
          <div className="relative shrink-0 size-[18px]" data-node-id="121:665" data-name="moon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMoon} />
          </div>
        </div>
        <div
          className="bg-[rgba(255,255,255,0)] content-stretch flex items-center justify-center overflow-clip p-[2px] relative rounded-[30px] shrink-0 size-[28px]"
          data-node-id="121:671"
          data-name="_Toggle base"
        >
          <div className="relative shrink-0 size-[18px]" data-node-id="121:675" data-name="sun">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSun} />
          </div>
        </div>
      </button>
    </div>
  );
}
