// /video-call-app/src/components/VideoCall.js

import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('http://localhost:5000'); // Ensure this matches your backend server URL

function VideoCall() {
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState('');
  const [me, setMe] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
    });

    socket.on('me', (id) => {
      setMe(id);
    });

    socket.on('callUser', ({ from, name: callerName, signal }) => {
      setReceivingCall(true);
      setCaller(from);
      setCallerSignal(signal);
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: me,
        name: 'Caller',
      });
    });

    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: caller });
    });

    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallAccepted(false);
    connectionRef.current.destroy();
  };

  return (
    <div>
      <div>
        <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />
        {callAccepted && <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} />}
      </div>
      <div>
        {receivingCall && !callAccepted ? (
          <button onClick={answerCall}>Receive Call</button>
        ) : (
          <div>
            <input
              type="text"
              placeholder="Enter ID to call"
              onChange={(e) => setIdToCall(e.target.value)}
            />
            <button onClick={() => callUser(idToCall)}>Call</button>
          </div>
        )}
        {callAccepted && <button onClick={leaveCall}>End Call</button>}
      </div>
      <div>Your ID: {me}</div>
    </div>
  );
}

export default VideoCall;
