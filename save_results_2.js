const fs = require('fs');

let searchResults = {};
if (fs.existsSync('search_results.json')) {
  searchResults = JSON.parse(fs.readFileSync('search_results.json', 'utf8'));
}

searchResults["Applications iOS avec Swift"] = {
  "_all": [
    { id: "nqTcAzPS3oc", title: "Build Your FIRST iOS App For Beginners 2024 Tutorial" },
    { id: "8Xcq4yRQ0pU", title: "Xcode 15 Tutorial for Beginners 2024" },
    { id: "HyQgpxX__-A", title: "WWDC24 SwiftUI essentials Apple" },
    { id: "yuo50-TiKgo", title: "Swift Build Your First App 2024 iOS for Beginners" },
    { id: "F2ojC6TNwws", title: "SwiftUI Tutorial for Beginners 3.5 hour FULL COURSE" },
    { id: "HJDCXdhQaP0", title: "How to Make an App Lesson 1 2024 SwiftUI" },
    { id: "-VC3hIEL7eQ", title: "SwiftUI Course for Beginners Create an iOS App from Scratch" },
    { id: "ayn9CdqbI_Y", title: "Getting started with SwiftUI with Xcode 26 for beginners 2026" },
    { id: "bqu6BquVi2M", title: "Lecture 1 Getting started with SwiftUI Stanford CS193p" },
    { id: "Q8riUXOHHXA", title: "Build a SwiftUI Sleep Tracker App Xcode 16 iOS 18" },
    { id: "6FMOsHiaExY", title: "iOS 2026 for Beginners Complete SwiftUI and Swift Guide" },
    { id: "4GjXq2Sr55Q", title: "Lecture 2 MVVM and the Swift Type System Stanford CS193p" },
    { id: "--qKOhdgJAs", title: "Lecture 3 MVVM and the Swift type system Stanford CS193p" },
    { id: "4CkEVfdqjLw", title: "Lecture 4 Stanford CS193p 2023" },
    { id: "SIYdYpPXil4", title: "Lecture 3 Reactive UI Protocols Layout Stanford CS193p" },
    { id: "W947iXBIFu4", title: "Swift Generics The Key to Reusable and Flexible Code" },
    { id: "Fz6hbH-t0eM", title: "Swift Protocols as Generic Constraints Monomorphization" },
    { id: "XWoNjiSPqI8", title: "Protocols with Associated Types Alexis Gallagher" },
    { id: "jTc1cSMaHz0", title: "Todo List App with SwiftData in SwiftUI iOS 17 Xcode 15" }
  ]
};

fs.writeFileSync('search_results.json', JSON.stringify(searchResults, null, 2));
console.log('Saved iOS results');
console.log('Courses with results:', Object.keys(searchResults));
