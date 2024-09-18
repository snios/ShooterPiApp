import React from "react";
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

const PromptModal = React.memo(
  ({
    visible,
    promptTitle,
    promptMessage,
    inputValue,
    setInputValue,
    handleSubmit,
    handleCancel,
  }) => (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
  )
);

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

export default PromptModal;
