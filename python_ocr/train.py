import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import os
import onnx

# --- 1. Define Model ---
class DigitCNN(nn.Module):
    def __init__(self, num_classes=11): # 0-9 and '/'
        super(DigitCNN, self).__init__()
        # Input size: 3 channels (RGB) x 28 x 28
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.relu = nn.ReLU()
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        # Size: 16 x 14 x 14
        
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        # Size: 32 x 7 x 7
        
        self.fc1 = nn.Linear(32 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = x.view(-1, 32 * 7 * 7) # Flatten
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

def train_model(data_dir="dataset/train", epochs=10, batch_size=32):
    if not os.path.exists(data_dir):
        print(f"Error: Training dataset directory '{data_dir}' not found.")
        print("Please run `extract.py` and organize your images into folders (0-9, slash) inside this directory.")
        return

    # --- 2. Load Data ---
    # We expect dataset/train/0, dataset/train/1, ..., dataset/train/slash
    transform = transforms.Compose([
        transforms.Resize((28, 28)),
        transforms.ToTensor(), # converts to [0.0, 1.0]
        # Normalize with standard ImageNet stats, though game images are different,
        # it helps the network converge faster.
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    try:
        dataset = datasets.ImageFolder(root=data_dir, transform=transform)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    except Exception as e:
        print(f"Failed to load dataset: {e}")
        return

    print(f"Loaded {len(dataset)} images from {len(dataset.classes)} classes: {dataset.classes}")
    
    # Save the class mapping so Node.js knows what 0,1..10 means
    with open("class_mapping.txt", "w") as f:
        for idx, cls in enumerate(dataset.classes):
            f.write(f"{idx}:{cls}\n")

    # --- 3. Train ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = DigitCNN(num_classes=len(dataset.classes)).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print(f"Starting training on {device} for {epochs} epochs...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
        epoch_loss = running_loss / len(dataset)
        print(f"Epoch {epoch+1}/{epochs} - Loss: {epoch_loss:.4f}")

    print("Training Complete!")

    # --- 4. Export to ONNX ---
    model.eval()
    # Create a dummy input tensor of the correct shape to trace the graph
    dummy_input = torch.randn(1, 3, 28, 28).to(device)
    onnx_path = "../server/src/utils/digits.onnx"
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    
    torch.onnx.export(
        model, 
        dummy_input, 
        onnx_path, 
        export_params=True,
        opset_version=11,          # ONNX version
        do_constant_folding=True,  # Optimize
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    
    print(f"Exported ONNX model to: {onnx_path}")
    print("This file will be read by Node.js using onnxruntime-node.")

if __name__ == "__main__":
    train_model(epochs=15)
