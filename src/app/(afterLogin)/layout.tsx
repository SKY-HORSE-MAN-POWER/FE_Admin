import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  chat: ReactNode;
  chatRoom: ReactNode;
  post: ReactNode;
};

export default function Layout({ children, chat, chatRoom, post }: Props) {
  return (
    <div>
      {children}
      <div
        className="flex items-center justify-between w-full mt-28"
        style={{ height: "580px", paddingLeft: "2.5%", paddingRight: "2.5%" }}
      >
        <div className="h-full w-[57.3%] flex justify-between p-[0.5%] bg-black bg-opacity-50 rounded-lg">
          {chat}
          {chatRoom}
        </div>
        {post}
      </div>
    </div>
  );
}
