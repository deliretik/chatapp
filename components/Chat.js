import React from 'react';
import { View, Text, Platform, KeyboardAvoidingView } from 'react-native';
//import giftedChat library
import { GiftedChat, Bubble, Day, SystemMessage} from 'react-native-gifted-chat';
//import asyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
//import NetInfo internet connection status
import NetInfo from '@react-native-community/netinfo';
//importing firestore using firebase
const firebase = require('firebase');
require('firebase/firestore');

export default class Chat extends React.Component {

  constructor() {
    super();
    this.state = {
      messages: [],
      uid: 0,
      user: {
        _id: "",
        name: "",
        avatar: "",
      },
      isConnected: false
    }

    const firebaseConfig = {
      apiKey: "AIzaSyCYMEflOC1GMcXNeIn-eFp_uvPbTN3FJ9A",
      authDomain: "chatapp-c28e2.firebaseapp.com",
      projectId: "chatapp-c28e2",
      storageBucket: "chatapp-c28e2.appspot.com",
      messagingSenderId: "476600146165",
      appId: "1:476600146165:web:049131a66e00ca2a30cdbc",
      measurementId: "G-SE5VB5NRQ1"
    }
  
  //initialize the app
    if (!firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
      }
  //reference firestore database
  this.referenceChatMessages = firebase.firestore().collection('messages');
  }
  //message gets stored in asyncStorage
  async getMessages() {
    let messages = '';
    try {
      messages = await AsyncStorage.getItem('messages') || [];
      this.setState({
        messages: JSON.parse(messages)
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  async saveMessages() {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(this.state.messages));
    } catch (error) {
      console.log(error.message);
    }
  };

  async deleteMessages() {
    try {
      await AsyncStorage.removeItem('messages');
      this.setState({
        messages: []
      })
    } catch (error) {
      console.log(error.message);
    }
  };
/* componentDidMount function gets called after Chat component mounts. State gets set
with static message so you see each element of the UI displayed on screen with setState function */

  componentDidMount() {

    //entering the name state from the start page to status bar
    const name = this.props.route.params.name;
    this.props.navigation.setOptions({ title: name});
    
    //netInfo to check connection status
    NetInfo.fetch().then(connection => {
      if (connection.isConnected) {
        this.setState({ isConnected: true });
        console.log('online');

          //listener for collection updates
          this.unsubscribe = this.referenceChatMessages
          .orderBy('createdAt', 'desc')
          .onSnapshot(this.onCollectionUpdate);

    //authentication
    this.authUnsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        await firebase.auth().signInAnonymously();
      }

      //update user state with currently active user data
      this.setState({
        uid: user.uid,
        messages: [],
        user: {
          _id: user.uid,
          name: name,
          avatar: "https://placeimg.com/140/140/any"
        }
      });

      this.refMsgsUser = firebase
            .firestore()
            .collection("messages")
            .where("uid", "==", this.state.uid);

        });
        this.saveMessages();
        } else {
          // if user offline
          this.setState({ isConnected: false });
          console.log('offline');
          this.getMessages();
        }
    });
  }

  onCollectionUpdate = (querySnapshot) => {
    const messages = [];
    // go through each document
    querySnapshot.forEach((doc) => {
      // get the QueryDocumentSnapshot's data
      let data = doc.data();
      messages.push({
        _id: data._id,
        text: data.text,
        createdAt: data.createdAt.toDate(),
        user: {
          _id: data.user._id,
          name: data.user.name,
          avatar: data.user.avatar
        }
      });
    });
    this.setState({
      messages: messages
    });
    // save messages to local AsyncStorge
    this.saveMessages()
  };

  //adding new message to database collection
  addMessage() {
    const message = this.state.messages[0];
    
    this.referenceChatMessages.add({
      uid: this.state.uid,
      _id: message._id,
      text: message.text,
      createdAt: message.createdAt,
      user: this.state.user
    });
  }

  //happens when user sends a message; addMessage() gets called to add message to the state
  onSend(messages = []) {
    this.setState((previousState) => ({
      messages: GiftedChat.append(previousState.messages, messages),
    }), () => {
      this.addMessage()
      this.saveMessages();
    });
  }

  //dont receive updates from collection
  componentWillUnmount() {
    if (this.state.isConnected) {
      this.authUnsubscribe();
      this.unsubscribe();
    }
  }

  //renderBubble function defines style of user messages
  renderBubble(props) {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {},
          right: {},
        }}
      />
    )
  };

  //renderDay function renders a message showing the date of the chat; the text color depends on the set background color
  renderDay(props) {
    const { bgColor } = this.props.route.params;
    return (
      <Day
        {...props}
        textStyle= {{color: bgColor === '#B9C6AE' ? '#555555' : '#dddddd'}}
      />
    );
  }

  //renderSystemMessage function renders a system message; the text color depends on the set background color
  renderSystemMessage(props) {
    const { bgColor } = this.props.route.params;
    return (
      <SystemMessage
        {...props}
        textStyle= {{color: bgColor === '#B9C6AE' ? '#555555' : '#dddddd'}}
      />
    );
  }
//render the default InputToolbar when the user is online
  renderInputToolbar(props) {
    if (this.state.isConnected == false) {
    } else {
      return(
        <InputToolbar
        {...props}
        />
      );
    }
  }

  render() {

    // color picked in Start screen gets applied for chat screen
    const { bgColor } = this.props.route.params;

    return (
      <View style={{
        flex: 1, 
        justifyContent: 'center', 
        backgroundColor: bgColor
        }}>
          <GiftedChat 
            messages={this.state.messages}
            onSend={(messages) => this.onSend(messages)}
            renderBubble={this.renderBubble.bind(this)}
            renderDay={this.renderDay.bind(this)}
            renderSystemMessage={this.renderSystemMessage.bind(this)}
            renderInputToolbar={this.renderInputToolbar.bind(this)}
            user={{
              _id: this.state.user._id,
              name: this.state.name,
              avatar: this.state.user.avatar
            }}
          />

        { Platform.OS === 'android' ? <KeyboardAvoidingView behavior="height" /> : null }
      </View>
    )
  }
}