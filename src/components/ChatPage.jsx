import React from "react";
import Peer from 'simple-peer'
import 'emoji-mart/css/emoji-mart.css'
import { Picker } from 'emoji-mart'
import { createContext, useState, useEffect, useMemo, useRef } from "react";
import { MdVideocam, MdScreenShare } from 'react-icons/md'
import { AiOutlineAudioMuted } from 'react-icons/ai'
import { ImPhoneHangUp } from 'react-icons/im'
import { GoUnmute } from 'react-icons/go'
import { FiVideo, FiVideoOff } from 'react-icons/fi'
import "react-chat-elements/dist/main.css";
import { Search, ThreeDotsVertical, EmojiLaughing, Paperclip, MicFill, Image } from "react-bootstrap-icons";
import { Container, Row, Form, Button } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import io from "socket.io-client";
import allActions from "../actions/index.js";
import { MessageList } from "react-chat-elements";
const SocketContext = createContext()
const endpoint = process.env.REACT_APP_BACK_URL;
function ChatPage(_props) {
    const [emojiPicker, setEmojiPicker] = useState(false)
    const [videoMuted, setVideoMuted] = useState(false)
    const [audioMuted, setAudioMuted] = useState(false)
    const [callAccepted, setCallAccepted] = useState(false)
    const [callEnded, setCallEnded] = useState(false)
    const [callRejected, setCallRejected] = useState(false)
    const [stream, setStream] = useState()
    const [call, setCall] = useState({})
    const [me, setMe] = useState("")
    const user = useSelector((state) => state.user);
    const chat = useSelector((store) => store.chat);
    const socket = useMemo(() => io(endpoint, { transports: ["websocket"] }), []);
    const [message, setMessage] = useState("");
    const dispatch = useDispatch();
    const videoMyself = useRef()
    const othersVideo = useRef()
    const connectionReference = useRef()
    // function updateScroll() {
    //     let objDiv = document.getElementById("chatBody");
    //     objDiv.scrollTop = objDiv.offsetHeight;
    // }

    useEffect(
        () => {
            console.log("adding event listeners");
            socket.on("connect", () => {
                // with on we're listening for an event
                console.log(socket.id);

                socket.emit("did-connect" /*userId */);
            });

            socket.on("message", ({ message, roomId }) => {
                console.log({ message, roomId }, "This is emit from back..");
                dispatch(allActions.chatActions.push_new_message({ message: message.message, sender: message.sender }));
            });
        },
        [
            /* chat.current_chat_room._id, user.currentUser.username */
        ]
    );

    useEffect(() => {
        socket.emit("joinRoom", { username: user.currentUser.username, roomId: chat.current_chat_room._id });
        socket.on("joinRoom", { username: user.currentUser.username, roomId: chat.current_chat_room._id });
    }, [chat.current_chat_room._id, user.currentUser.username]);

    useEffect(() => {

        socket.on("me", (id) => setMe(id))
        socket.on("callUser", ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal })
        })
    }, [])

    function answerCall() {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream)
            if (videoMyself.current) {
                videoMyself.srcObject = currentStream
            }
        })
        setCallAccepted(true)
        const peer = new Peer({ initiator: false, trickle: false, stream })
        peer.on("signal", (data) => {
            socket.emit("acceptCall", { signal: data, to: call.from })
        })
        peer.on("stream", (currentStream) => {
            othersVideo.current.srcObject = currentStream
        })
        peer.signal(call.signal)
        connectionReference.current = peer
    }
    function rejectCall() {
        setCallRejected(true)
        socket.emit("rejectCall", { to: call.from })
        window.location.reload()
    }
    function endCall() {
        connectionReference.current.destroy()
        socket.emit("endCall", { to: call.from })
        window.location.reload()
    }
    function shareScreen() {
        navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(screenStream => {
            connectionReference.current.replaceTrack(stream.getVideoTracks()[0], screenStream.getVideoTracks()[0], stream)
            videoMyself.current.srcObject = screenStream
            screenStream.getTracks()[0].onended = () => {
                connectionReference.current.replaceTrack(screenStream.getVideoTracks()[0], stream.getVideoTracks()[0], stream)
                videoMyself.current.srcObject = stream
            }

        })
    }
    function toggleMuteAudio() {
        if (stream) {
            setAudioMuted(!audioMuted)
            stream.getAudioTracks()[0].enabled = audioMuted
        }
    }
    function toggleMuteVideo() {
        if (stream) {
            setVideoMuted(!videoMuted)
            stream.getVideoTracks()[0].enabled = videoMuted
        }
    }
    function renderCall() {
        if (!callRejected && !callAccepted)
            return 'none'
        return 'block'
    }
    function renderLanding() {
        if (!callRejected && !callAccepted)
            return 'block'
        return 'none'
    }


    function callUser(id) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream)
            if (videoMyself.current) {
                videoMyself.srcObject = currentStream
            }
        })
        const peer = new Peer({ initiator: true, trickle: false, stream })
        peer.on("signal", (data) => {
            socket.emit("callUser", { userToCall: id, signalData: data, from: me, name: user.currentUser.username })
        })
        peer.on("stream", (currentStream) => {
            if (othersVideo.current) {
                othersVideo.srcObject = currentStream
            }
        })
        socket.on("acceptCall", (signal) => {
            setCallAccepted(true)
            peer.signal(signal)
        })
        socket.on("rejectCall", () => {
            window.location.reload()
        })
        connectionReference.current = peer
    }
    const leaveCall = () => {
        setCallEnded(true)
        connectionReference.current.destroy()
    }

    function handleSubmit(e) {
        e.preventDefault();
        const roomId = chat.current_chat_room._id;
        console.log(chat.current_chat_room);
        socket.emit("sendMessage", {
            roomId,
            message: {
                message: message,
                sender: user.currentUser._id
            }
        });
        // console.log(message);
        dispatch(allActions.chatActions.push_new_message({ message: message, sender: user.currentUser }));
        setMessage("");
    }

    let VideoOfMyself
    if (stream) {
        VideoOfMyself = (
            <video className='userVideo' playsInline muted ref={videoMyself} autoPlay />
        )
    }
    let PartnersVideo
    if (callAccepted) {
        PartnersVideo = (
            <video className='partnerVideo cover' playsInline ref={othersVideo} />
        )
    }
    let IncomingCall
    if (!callAccepted && !callRejected) {
        IncomingCall = (
            <div className="incomingCallContainer">
                <div className="incomingCall flex flex-column">
                    <div><span className="callerID">{user.currentUser.username}</span> is calling you!</div>
                    <div className="incomingCallButtons flex">
                        <button name="accept" className="alertButtonPrimary" onClick={() => answerCall()}>Accept</button>
                        <button name="reject" className="alertButtonSecondary" onClick={() => rejectCall()}>Reject</button>
                    </div>
                </div>
            </div>
        )
    }
    let controlAudio
    if (audioMuted) {
        controlAudio = <span className="iconContainer" onClick={() => toggleMuteAudio()}>
            <GoUnmute alt="unMute audio" />
        </span>
    } else {
        controlAudio = <span className="iconContainer" onClick={() => toggleMuteAudio()}>
            <AiOutlineAudioMuted alt="Mute audio" />
        </span>
    }

    let controlVideo
    if (videoMuted) {
        controlVideo = <span className="iconContainer" onClick={() => toggleMuteVideo()}>
            <FiVideo alt="Resume video" />
        </span>
    } else {
        controlVideo = <span className="iconContainer" onClick={() => toggleMuteVideo()}>
            <FiVideoOff alt="Stop video" />
        </span>
    }
    let screenSharing = <span className="iconContainer" onClick={() => shareScreen()}>
        <MdScreenShare alt="Share screen" />
    </span>
    let hangTheCallUp = <span className="iconContainer" onClick={() => endCall()}>
        <ImPhoneHangUp alt="End call" />
    </span>
    console.log(chat)
    const addEmoji = e => {
        console.log(e)
        let sym = e.unified.split('-')
        let codesArray = []
        sym.forEach(el => codesArray.push('0x' + el))
        let emoji = String.fromCodePoint(...codesArray)
        setMessage(message + emoji)
    }


    return (
        <>
            {/* {!callUser || !answerCall ? (
                <>
                    <div className="partnerVideoContainer">
                        {PartnersVideo}
                    </div>
                    <div className="userVideoContainer">
                        {VideoOfMyself}
                    </div>
                    <div className="controlsContainer flex">
                        {controlAudio}
                        {controlVideo}
                        {screenSharing}
                        {hangTheCallUp}
                    </div>
                </>
            )
                : ( */}
            {chat.current_chat_room && (

                <Container className="mainContianer-chat">
                    {/* {IncomingCall ? IncomingCall : 'no Incoming Call'} */}

                    <Row className="chatRow chatHeader">
                        <div id="chatBoxDetails">
                            <>
                                <div className="" role="button">
                                    <div className="chatHeadImgDiv">
                                        <img src={chat.prev_chat_rooms && chat.prev_chat_rooms.length > 0 && chat.prev_chat_rooms.members && chat.prev_chat_rooms.members.filter((member) => member._id !== user.currentUser._id) ? chat.prev_chat_rooms.members[0].avatar : 'https://picsum.photos/200'} /* style={{ borderRadius: "50%" }} */ className="rounded-circle" alt="" />
                                    </div>
                                </div>
                                <div className="chatUser">
                                    <div className="chatUser-details">{chat.current_chat_room.length > 0 && chat.current_chat_room.members && chat.current_chat_room.members.filter((member) => member._id !== user.currentUser._id) ? chat.current_chat_room.members[0].username : 'No room'}</div>
                                    <div className="chatUser-details">Online</div>
                                </div>
                                <div className="chatHeadIconDiv">

                                    <MdVideocam size="25" onClick={() => callUser(user.currentUser._id)} />
                                </div>
                                <div className="chatHeadIconDiv">
                                    <ThreeDotsVertical size="20" />
                                </div>
                            </>

                        </div>
                    </Row>

                    <Row className="chatRow" id="chatBody">
                        <div className="chatBody-childDiv py-2 ">

                            {chat.current_chat_room.chats?.length > 0 ? (
                                chat.current_chat_room.chats.map((chat) => {
                                    return (
                                        <>
                                            <div className={`d-flex flex-row${chat.sender._id === user.currentUser?._id ? "-reverse" : ""}`}>
                                                <div key={chat._id} className={` ${chat.sender._id === user.currentUser?._id ? "messageSent round p-2 m-3" : "messageReceived round p-2 m-3"}`}>
                                                    <strong>{chat.sender.firstname} </strong>
                                                    <p>{chat.message} </p>
                                                </div>
                                            </div>

                                        </>

                                    );
                                })
                            ) : (
                                <div>
                                    <p className="py-4 ">
                                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium, eos quo! Accusamus recusandae repudiandae, eum quae at totam culpa explicabo! Quae recusandae
                                        aliquid error pariatur in nobis animi, enim quasi.
                                    </p>
                                </div>
                            )}
                            {emojiPicker === true ? (
                                <Picker onSelect={((e) => addEmoji(e))} />
                            ) : null}
                        </div>

                    </Row>
                    <Row className="chatRow chatFooter ">
                        <div className="chatFooterDetails py-2 px-3 ">
                            <div className="icon-width">
                                <Button onClick={() => emojiPicker ? setEmojiPicker(false) : setEmojiPicker(true)}  >  <EmojiLaughing size="25" /> </Button>
                            </div>
                            <div>
                                <Paperclip size="25" />
                            </div>
                            <Form className="messageInput" onSubmit={(e) => handleSubmit(e)}>
                                <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
                                    <Form.Control type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="name@example.com" />
                                </Form.Group>
                            </Form>
                            <div>
                                <MicFill size="22" />
                            </div>
                        </div>
                    </Row>

                </Container>

            )}


        </>
    );
}
export default ChatPage;
