"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { EventSourcePolyfill } from "event-source-polyfill";

// import BoardInfo from "@/components/molecules/BoardInfo";
// import BackHeader from "../layout/BackHeader";
// import { convertUToKST } from "@/utils/convertUToKst";
// import { sessionValid } from "@/utils/session/sessionValid";
import styles from "@/styles/chat.module.scss";

interface ChatProps {
  authorization: any;
  uuid: any;
  roomNumber: any;
}

interface ChatType {
  content: string;
  createdAt: string;
  handle: string;
  profileImage: string;
  uuid: string;
}

const ChatRoom: React.FC<ChatProps> = ({ authorization, uuid, roomNumber }) => {
  const [chatData, setChatData] = useState<ChatType[]>([]);
  const [userUUID, setUserUUID] = useState<any>("");
  const [newMessage, setNewMessage] = useState<string>("");
  // const [temp, setTemp] = useState<boolean>(false);
  // const [focus, setFocus] = useState<boolean>(false);

  const { ref, inView } = useInView();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef<number>(0);
  const isAtBottom = useRef<boolean>(true);
  // const inputRef = useRef<HTMLInputElement>(null);

  const fetchListData = useCallback(
    async ({ pageParam = 0 }) => {
      const enterTime = new Date().toISOString();
      console.log(enterTime);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_REACT_APP_API_URL}/chat-service/api/v1/authorization/chat/previous/${roomNumber}?enterTime=${enterTime}&page=${pageParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authorization}`,
            uuid: `${uuid}`,
          },
        }
      );

      const data = await res.json();
      console.log(data);
      const reversedData = data.previousChatWithMemberInfoDtos.reverse();

      setChatData((prevData) => [...reversedData, ...prevData]);
      // if (pageParam === 0) {
      //   setTemp(!temp);
      // }
      console.log(chatData);

      return reversedData;
    },
    [roomNumber]
  );

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["message", "chat"],
    queryFn: fetchListData,
    initialPageParam: 0,
    staleTime: 0,
    gcTime: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = lastPage.length ? allPages.length : undefined;
      return nextPage;
    },
  });
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const eventSource = useRef<null | EventSource>(null);

  useEffect(() => {
    const fetchSSE = () => {
      eventSource.current = new EventSourcePolyfill(
        `${process.env.NEXT_PUBLIC_REACT_APP_API_URL}/chat-service/api/v1/authorization/chat/roomNumber/${roomNumber}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${authorization}`,
            uuid: `${uuid}`,
          },
        }
      );
      eventSource.current.onmessage = (event) => {
        const newData: ChatType = JSON.parse(event.data);
        console.log("새로 받은 데이터", newData);
        setChatData((prevData) => {
          if (
            !prevData.some(
              (chat) =>
                chat.content === newData.content &&
                chat.createdAt === newData.createdAt &&
                chat.handle === newData.handle
            )
          ) {
            return [...prevData, newData];
          }
          return prevData;
        });
        scrollToBottom();
      };
      eventSource.current.onerror = async () => {
        console.log("에러");
        eventSource.current?.close();
        fetchSSE();
      };
      eventSource.current.onopen = (event) => {
        console.log("onopen");
        console.log("채팅방 연결 성공:", event);
      };
    };
    fetchSSE();
    console.log("안녕");
    return () => {
      eventSource.current?.close();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView();
  };

  //스크롤 유지 로직
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      if (isAtBottom.current) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } else {
        chatContainer.scrollTop +=
          chatContainer.scrollHeight - prevScrollHeight.current;
      }
    }
  }, [chatData]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      const handleScroll = () => {
        isAtBottom.current =
          chatContainer.scrollTop + chatContainer.clientHeight >=
          chatContainer.scrollHeight;
        prevScrollHeight.current = chatContainer.scrollHeight;
      };

      chatContainer.addEventListener("scroll", handleScroll);
      return () => chatContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(event.target.value);
  };

  //메시지 엔터 1
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  //메시지 엔터 2
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }
    console.log(authorization, uuid, newMessage, roomNumber);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_REACT_APP_API_URL}/chat-service/api/v1/authorization/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authorization}`,
            uuid: `${uuid}`,
          },
          body: JSON.stringify({
            content: newMessage,
            roomNumber: roomNumber,
          }),
        }
      );

      console.log(res.status);
      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setNewMessage("");
      scrollToBottom();
      // setTemp(!temp);
      // setFocus(!focus);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div
      style={{
        width: "40%",
        height: "100%",
        background: "#00000060",
        borderRadius: "0px 7px 7px 0px",
      }}
    >
      <main className={styles.main} ref={chatContainerRef}>
        {chatData.map((chat, index) => {
          const isUserMessage = chat.uuid === uuid;
          const isSameHandleAsPrevious =
            index > 0 && chatData[index - 1].handle === chat.handle;

          return (
            <div
              key={index}
              id={`message-${index}`}
              ref={index === 0 ? ref : null}
              className={
                isUserMessage
                  ? `${styles.chatLayout} ${styles.chatLayoutMy}`
                  : styles.chatLayout
              }
            >
              {!isUserMessage && !isSameHandleAsPrevious && (
                <div className={styles.chatContainer}>
                  <div className={styles.profileImageContainer}>
                    <img
                      src={chat.profileImage}
                      alt={`${chat.handle}'s profile`}
                      className={styles.profileImage}
                    />
                  </div>
                  <div className={styles.chatInfo}>
                    <p className={styles.handle}>{chat.handle}</p>
                    <p className={styles.createdAt}>{chat.createdAt}</p>
                  </div>
                </div>
              )}
              <div
                className={
                  isUserMessage ? styles.chatContentMy : styles.chatContent
                }
              >
                {chat.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <div className={styles.chatInput}>
        <input
          type="text"
          // ref={inputRef} // Attach the ref to the input field
          placeholder="메시지를 입력하세요..."
          value={newMessage}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
        />
        <div className={styles.sendBtnContainer} onClick={sendMessage}>
          <div className={styles.sendBtn}>✔️</div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;