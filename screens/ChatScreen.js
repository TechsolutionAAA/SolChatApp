// screens/ChatScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  Clipboard,
} from "react-native";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import bs58 from "bs58";

global.Buffer = global.Buffer || Buffer;

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Establish a connection to the Solana Devnet
  const connection = new Connection(clusterApiUrl("devnet"));

  const base58PrivateKey =
    "2X8SoSEj1n8nPCu8UQvoiQWMRwzXtq2SU4L75rHY9VfGDzxp1Zx2MLvN1brWJrPy8jH5FGdNk8Kfj9gLdWWHW2sb";
  // Define the sender and recipient public keys
  const senderSecretKey = bs58.decode(base58PrivateKey);
  const senderKeypair = Keypair.fromSecretKey(senderSecretKey);
  const recipientPublicKey = new PublicKey(
    "CNmWr7eWb5J3oJVt4xRwo4ggqiaYvs6zxB1UXRx4eNzS"
  );

  useEffect(() => {
    // Check and log the sender's balance (optional)
    const checkBalance = async () => {
      const balance = await connection.getBalance(senderKeypair.publicKey);
      console.log(
        `Balance for ${senderKeypair.publicKey.toBase58()}: ${balance} lamports`
      );

      // If balance is below a threshold, request an airdrop
      if (balance < LAMPORTS_PER_SOL * 0.01) {
        // Request airdrop if balance is below 0.01 SOL
        console.log("Requesting airdrop...");
        const airdropSignature = await connection.requestAirdrop(
          senderKeypair.publicKey,
          LAMPORTS_PER_SOL // Request 1 SOL
        );
        await connection.confirmTransaction(airdropSignature);
        console.log("Airdrop successful!");
      }
    };

    checkBalance();
  }, []);

  const shortenAddress = (address) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const sendMessage = async () => {
    if (input.trim()) {
      const message = input.trim();

      try {
        // Create a memo instruction to store the message
        const memoInstruction = new TransactionInstruction({
          keys: [],
          programId: new PublicKey(
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          ),
          data: Buffer.from(message),
        });

        // Create the transaction and add both the transfer and memo instructions
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: recipientPublicKey,
            lamports: 1000, // Minimal amount of lamports for the transaction
          }),
          memoInstruction // Attach the memo instruction
        );

        const signature = await connection.sendTransaction(transaction, [
          senderKeypair,
        ]);

        console.log("Transaction signature:", signature);

        // Console log the Solana Devnet transaction link
        const transactionUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        console.log("View your transaction here:", transactionUrl);

        // Simulate storing the message in the app's state
        const newMessage = {
          id: Date.now(),
          text: `From ${shortenAddress(
            senderKeypair.publicKey.toBase58()
          )}: ${message}`,
          transactionUrl, // Store the transaction URL for easy access
        };
        setMessages([...messages, newMessage]);
        setInput("");

        // Show an alert when the message is successfully sent
        Alert.alert("Success", "Message sent successfully!", [{ text: "OK" }]);
      } catch (error) {
        console.error("Failed to send message:", error);

        // If the error is due to insufficient funds, suggest adding more SOL
        if (error.message.includes("insufficient funds")) {
          Alert.alert(
            "Insufficient Funds",
            "Not enough SOL to complete the transaction. Consider airdropping more SOL to your account.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Error", "Failed to send message. Please try again.", [
            { text: "OK" },
          ]);
        }
      }
    }
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert(
      "Copied to Clipboard",
      "The transaction link has been copied to your clipboard.",
      [{ text: "OK" }]
    );
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text
        style={styles.transactionLink}
        onPress={() => copyToClipboard(item.transactionUrl)}
      >
        Copy Transaction Link
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.walletInfo}>
        Sender Wallet: {shortenAddress(senderKeypair.publicKey.toBase58())}
      </Text>
      <Text style={styles.receiverInfo}>
        Receiver Wallet: {shortenAddress(recipientPublicKey.toBase58())}
      </Text>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
        />
        <Button title="Send" onPress={sendMessage} style={styles.sendButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  walletInfo: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
    fontWeight: "bold",
  },
  receiverInfo: {
    fontSize: 16,
    marginBottom: 20,
    color: "#555",
    fontWeight: "bold",
  },
  messageList: {
    paddingBottom: 60,
  },
  messageContainer: {
    padding: 10,
    backgroundColor: "#e1f5fe",
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 14,
    color: "#333",
  },
  transactionLink: {
    fontSize: 12,
    color: "#1e88e5",
    textDecorationLine: "underline",
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#2196f3",
    borderRadius: 8,
  },
});
