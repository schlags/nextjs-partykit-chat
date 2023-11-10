'use client';


import React from "react";
import usePartySocket from "partysocket/react";
import { useState, useEffect, useRef } from "react";
import uuid from "react-uuid";
import { parse } from "path";

interface ChatMessage {
  user: string;
  message: string;
  time: Date;
}

interface ServerMessage {
  user: string;
  time: Date;
  changeReason: string;
  connections: number;
}

interface ConnectionStatus {
  status: string;
  userName?: string;
}

function Message({ message }: { key: string, message: ChatMessage }) {
  const userAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${message.user}&background=%23fff&radius=50&margin=10`
  return (
    <div className="p-2 max-w-sm mx-auto gap-2 bg-white content-start rounded-s border-t shadow-md flex items-center space-x-2">
    <div className="shrink-0">
      <img className="h-12 w-12" src={userAvatar} alt="User's avatar" />
    </div>
      <div>
        {/* <div className="text-xs font-medium text-slate-500">{message.user}</div> */}
        <p className="text-black text-sm">{message.message}</p>
      </div>
      {/* time stamp */}
      <div className="text-xs font-small text-slate-300 align-right">{message.time.toLocaleTimeString()}</div>
    </div>
  )
}

function ServerMessage({ message }: { key: string; message: ServerMessage }) {
  const userAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${message.user}&background=%23fff&radius=50&margin=10`;

  return (
    <div key={uuid()} className="bg-gray-100 rounded-lg p-1 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0">
          <img
            src={userAvatar}
            alt="User's avatar"
            width="20"
            height="20"
            className="rounded-full h-10 w-10 object-cover"
          />
        </div>
        <p className="text-gray-800 font-bold h-50">has {message.changeReason}!</p>
      </div>
      <p className="text-gray-500 text-sm">{message.time.toLocaleTimeString()}</p>
    </div>
  );
}

function ActiveConnectionsStatus({ message }: { message?: ServerMessage }) {
  return (
    <div className="flex justify-center items-center space-x-2 ">
      <div className="text-sm text-slate-500">People Here:</div>
      <div className="text-sm font-bold text-lime-500 animate-pulse accent-green">{message?.connections || 0}</div>
    </div>
  );
}



function DisplayMessages( { messages }: { messages: ChatMessage[] } ) {
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {scrollToBottom()}, [messages]);
  return (
    <div className="content-evenly hover:content-stretch">
      {messages.map(message => <Message key={uuid()} message={message} />)}
      <div ref={messagesEndRef} />
    </div>
  );
}

function DisplayServerMessages( { messages }: { messages: ServerMessage[] } ) {
  console.log(messages);
  return (
    messages.map((message) => <ServerMessage key={uuid()} message={message} />)
  );

}

function DisplayUsersPresent( { users }: { users: string[] } ) {
  return (
    users.map((user) => <div className="h-12 w-12" key={uuid()}><ConnectionPing /><img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user}&background=%23fff&radius=50&margin=10`}></img></div>)
  );
}

function ConnectionPing() {
  return (
    <span className="relative flex h-3 w-3 top-0 right-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
  </span>
  )
}

function ShowConnectionStatus( { status }: { status: ConnectionStatus } ) {
  return (
    <div className="flex flex-row justify-center items-center">
      <span className="relative inline-flex justify-center">
        <span className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-sky-500 bg-white dark:bg-slate-800 transition ease-in-out cursor-default duration-150 ring-1 ring-slate-900/10 dark:ring-slate-200/20">
          {status.status}
        </span>
        {status.status === "Connected" ? <ConnectionPing /> : null}
      </span>
    </div>
  )

}

export default function Home() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [serverMessages, setServerMessages] = useState<ServerMessage[]>([]);
  const [latestServerMessage, setLatestServerMessage] = useState<ServerMessage>({user: "", time: new Date(Date.now()), changeReason: "", connections: 0});
  const [peoplePresent, setPeoplePresent] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({status: "Disconnected"});
  const [inputMessage, setInputMessage] = useState<string>("");
  const [userName, setUserName] = useState<string>("");


  const ws = usePartySocket({
    host: `${process.env.NEXT_PUBLIC_PARTYSOCKET_HOST || "localhost:1999"}`,
    room: "tic-tac-toe",
    id: userName,

    onOpen() {
      console.log("Connected!")
      setConnectionStatus({status: "Connected", userName: userName})
    },
    onMessage(message) {
      console.log("Message:", message.data)
      let parsedMessage: any;
      try {
        parsedMessage = JSON.parse(message.data);

        if (parsedMessage!.changeReason) {
          const serverMessage: ServerMessage = {time: new Date(Date.now()), ...parsedMessage};
          setServerMessages([serverMessage, ...serverMessages]);
          setLatestServerMessage(serverMessage);
          if (serverMessage.changeReason === "connected") {
            setPeoplePresent([...peoplePresent, serverMessage.user]);
          } else if (serverMessage.changeReason === "left") {
            setPeoplePresent(peoplePresent.filter((person) => person !== serverMessage.user));
          }
          return;
        } else if (parsedMessage!.message) {
          const chatMessage: ChatMessage = {time: new Date(Date.now()), ...parsedMessage};
          setChatMessages([...chatMessages, chatMessage]);
          return;
        }
      } catch (e) {
        console.log("Error parsing message:", e);
      }
    },
    onClose() {
      console.log("Disconnected!")
      setConnectionStatus({status: "Disconnected"})
    },
    onError(error) {
      console.log("Error:", error)
      setConnectionStatus({status: `Error`})
    }
  });


  const handleInputMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(event.target.value);
  }

  const handleMessageSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputMessage) {
      ws.send(inputMessage);
      // clear input from input field
      setInputMessage("");
    } else {
      alert("No message to send!");
    }
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-14">
      <ShowConnectionStatus status={connectionStatus} />



      <div className="bg-slate-400 rounded-lg shadow-lg p-4 space-x-4 h-24 w-96 overflow-x-auto">
        <div className="flex items-center">
          <DisplayUsersPresent users={peoplePresent} />
        </div>
      </div>
      {/* Divider */}
      <div className="border-t border-teal-100 my-1 w-96"></div>

      <div className="bg-gray-100 rounded-lg shadow-lg p-4 h-96 w-96 overflow-y-scroll">
        <div>
          <DisplayMessages messages={chatMessages} />
          <div id="bottom-of-messages" style={{ float: "left", clear: "both" }} />
        </div>
      </div>

      <form className="w-full justify-center flex" onSubmit={handleMessageSend}>
        <div className="flex items-center border-b border-blue-500 py-2">
          <input className="appearance-none bg-transparent border-none w-full text-white-700 mr-3 py-1 px-2 leading-tight focus:outline-none" type="text" placeholder="What's on your mind?" value={inputMessage} onChange={handleInputMessageChange}/>
          <div className="flex-shrink-0 border-t text-xs text-white py-1 px-2 ">
            Enter to Send
          </div>
        </div>
      </form>
      <div className="flex flex-row justify-center items-center space-x-2"><ActiveConnectionsStatus message={latestServerMessage}/></div>
    </main>
  )
}