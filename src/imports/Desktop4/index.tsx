import svgPaths from "./svg-73yjqfftjx";

function Input() {
  return (
    <div className="relative rounded-[45px] shrink-0 w-full" data-name="Input">
      <div aria-hidden className="absolute border-[#475e6b] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[45px]" />
      <div className="content-stretch flex flex-col items-start p-[16px] relative size-full">
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal h-[24px] leading-[24px] not-italic relative shrink-0 text-[#1d1c3f] text-[16px] w-[314px]">***********</p>
      </div>
    </div>
  );
}

function Input1() {
  return (
    <div className="relative rounded-[45px] shrink-0 w-full" data-name="Input">
      <div aria-hidden className="absolute border-[#475e6b] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[45px]" />
      <div className="content-stretch flex flex-col items-start p-[16px] relative size-full">
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#1d1c3f] text-[16px] w-[314px]">john.doe@gmail.com</p>
      </div>
    </div>
  );
}

function Login() {
  return (
    <div className="absolute contents left-[786px] top-[288px]" data-name="Login">
      <p className="[word-break:break-word] absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[1138.25px] not-italic text-[#4d4d4d] text-[16px] top-[715px] w-[232.826px]">Did you forget your password?</p>
      <div className="absolute bg-[#0073ff] left-[966.7px] rounded-[45px] top-[631px] w-[222.7px]" data-name="Button">
        <div className="flex flex-row justify-center size-full">
          <div className="content-stretch flex items-start justify-center p-[18px] relative size-full">
            <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] min-w-px not-italic relative text-[16px] text-center text-white">Log in</p>
          </div>
        </div>
      </div>
      <div className="absolute left-[786px] top-[519px] w-[585.076px]" data-name="Input-password">
        <div className="content-stretch flex flex-col gap-[8px] items-start relative size-full">
          <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#1d1c3f] text-[16px] w-[314px]">Password</p>
          <Input />
        </div>
      </div>
      <div className="absolute left-[786px] top-[411px] w-[585.076px]" data-name="Input-email">
        <div className="content-stretch flex flex-col gap-[8px] items-start relative size-full">
          <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#1d1c3f] text-[16px] w-[314px]">Email</p>
          <Input1 />
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] leading-[20px] left-[786px] not-italic text-[#4d4d4d] text-[14px] top-[339px] w-[428.52px]">Login with the data you entered during your registration.</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Light',sans-serif] h-[66px] leading-[20px] left-[786px] not-italic text-[48px] text-black top-[288px] w-[227.584px]">Login</p>
    </div>
  );
}

export default function Desktop() {
  return (
    <div className="bg-white relative size-full" data-name="Desktop - 4">
      <div className="absolute bg-[#0073ff] h-[984px] left-[20px] rounded-[45px] top-[20px] w-[704px]" />
      <Login />
      <div className="absolute left-[20px] size-[100px] top-[20px]">
        <div className="absolute inset-[21.35%_22.27%_24.96%_22.27%]">
          <svg className="block size-full" fill="none" height="53.6907" preserveAspectRatio="none" viewBox="0 0 55.462 53.6907" width="55.462">
            <path d={svgPaths.p11cd5b00} fill="white" id="Star 1" />
          </svg>
        </div>
      </div>
    </div>
  );
}