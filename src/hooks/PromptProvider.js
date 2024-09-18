// PromptProvider.js
import React, { createContext, useContext, useState } from "react";
import {
  Modal,
  View,
  TextInput,
  Button,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  Platform,
  KeyboardAvoidingView,
} from "react-native";

export const PromptContext = createContext();

export const PromptProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [resolvePromise, setResolvePromise] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [promptMessage, setPromptMessage] = useState("");

  const prompt = (title = "Enter Input", message = "") => {
    return new Promise((resolve) => {
      setPromptTitle(title);
      setPromptMessage(message);
      setResolvePromise(() => resolve);
      setVisible(true);
    });
  };

  const handleSubmit = () => {
    setVisible(false);
    if (resolvePromise) {
      resolvePromise(inputValue);
    }
    setInputValue("");
  };

  const handleCancel = () => {
    setVisible(false);
    if (resolvePromise) {
      resolvePromise(null);
    }
    setInputValue("");
  };

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {visible && (
        <Modal transparent visible={visible} animationType="fade">
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.modalBackground}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalContainer}
              >
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <Text style={styles.title}>{promptTitle}</Text>
                    {promptMessage !== "" && (
                      <Text style={styles.message}>{promptMessage}</Text>
                    )}
                    <TextInput
                      placeholder="Enter input"
                      value={inputValue}
                      onChangeText={setInputValue}
                      style={styles.input}
                      autoFocus
                    />
                    <View style={styles.buttonContainer}>
                      <Button title="Cancel" onPress={handleCancel} />
                      <Button title="Submit" onPress={handleSubmit} />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </PromptContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
  },
  modalContainer: {
    marginHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 5,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
