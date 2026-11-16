import type { SampleCase, SupportedLanguage } from '../types/debugger';

export const LANGUAGE_META: Record<
  SupportedLanguage,
  { label: string; extension: string; fileName: string }
> = {
  python: { label: 'Python', extension: '.py', fileName: 'grade_analyzer.py' },
  c: { label: 'C', extension: '.c', fileName: 'matrix_stats.c' },
  cpp: { label: 'C++', extension: '.cpp', fileName: 'inventory_sort.cpp' },
  java: { label: 'Java', extension: '.java', fileName: 'StudentRegistry.java' },
  javascript: { label: 'JavaScript', extension: '.js', fileName: 'cartCalculator.js' },
};

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'sample-python-grades',
    title: 'Student Average & Duplicate Finder',
    language: 'python',
    fileName: 'grade_analyzer.py',
    description: 'Contains syntax colon omission, mutable default argument, division by zero edge case, and O(n^2) duplicate scan.',
    expectedErrorTypes: ['Syntax Error', 'Runtime Error', 'Logical Error', 'Performance Issue'],
    code: `def add_score(score, scores=[]):
    scores.append(score)
    return scores

def calculate_average(numbers)
    total = 0
    for i in range(len(numbers)):
        total += numbers[i]
    return total / len(numbers)

def find_duplicates(items):
    duplicates = []
    for i in range(len(items)):
        for j in range(len(items)):
            if i != j and items[i] == items[j]:
                if items[i] not in duplicates:
                    duplicates.append(items[i])
    return duplicates

def print_status(score):
    if score = 100:
        print("Perfect score!")
    else:
        print("Final score: " + score)

grades = add_score(92)
print("Average:", calculate_average([]))`,
  },
  {
    id: 'sample-c-array',
    title: 'Pointer & Array Sum Utility',
    language: 'c',
    fileName: 'matrix_stats.c',
    description: 'Includes missing header, uninitialized accumulator, off-by-one array bounds, scanf missing &, and memory leak.',
    expectedErrorTypes: ['Syntax Error', 'Runtime Error', 'Logical Error'],
    code: `int main() {
    int count = 5;
    int values[5] = {10, 20, 30, 40, 50};
    int sum;
    int target;

    printf("Enter target value: ");
    scanf("%d", target);

    for (int i = 0; i <= count; i++) {
        sum += values[i];
    }

    if (sum = 150) {
        printf("Exact match found\\n");
    }

    int *buffer = (int *)malloc(sizeof(int) * 10);
    buffer[0] = sum;
    return 0
}`,
  },
  {
    id: 'sample-cpp-inventory',
    title: 'Inventory Vector & Average',
    language: 'cpp',
    fileName: 'inventory_sort.cpp',
    description: 'Includes missing iostream include, integer division truncation, dangling pointer risk, and vector bounds issue.',
    expectedErrorTypes: ['Syntax Error', 'Logical Error', 'Runtime Error', 'Type Error'],
    code: `#include <vector>

using namespace std;

double computeRatio(int passed, int total) {
    return passed / total;
}

int main() {
    vector<int> stock = {12, 45, 7, 19};
    int highest = 0;

    for (int i = 0; i <= stock.size(); i++) {
        if (stock[i] > highest) {
            highest = stock[i];
        }
    }

    int* ptr = new int(42);
    cout << "Highest: " << highest << endl;
    cout << "Ratio: " << computeRatio(3, 4) << endl;
    return 0;
}`,
  },
  {
    id: 'sample-java-registry',
    title: 'Student Name Matcher & Score',
    language: 'java',
    fileName: 'StudentRegistry.java',
    description: 'Contains == string comparison bug, potential NullPointerException, loop off-by-one, and missing return statement.',
    expectedErrorTypes: ['Logical Error', 'Runtime Error', 'Syntax Error', 'Performance Issue'],
    code: `public class StudentRegistry {
    public static String findRole(String username) {
        String role = null;
        if (username == "admin") {
            role = "Administrator";
        }
        return role.toUpperCase();
    }

    public static int sumScores(int[] scores) {
        int total = 0;
        for (int i = 0; i <= scores.length; i++) {
            total += scores[i];
        }
        System.out.println("Total computed: " + total);
    }

    public static void main(String[] args) {
        int[] marks = {88, 91, 76};
        System.out.println(findRole(new String("admin")));
        System.out.println(sumScores(marks));
    }
}`,
  },
  {
    id: 'sample-js-cart',
    title: 'E-Commerce Cart Totalizer',
    language: 'javascript',
    fileName: 'cartCalculator.js',
    description: 'Includes const reassignment, assignment inside conditional, loose == coercion, undeclared variable, and string concatenation type bug.',
    expectedErrorTypes: ['Type Error', 'Logical Error', 'Name & Scope Error', 'Syntax Error'],
    code: `function calculateCartTotal(items, taxRate) {
  const subtotal = 0;
  for (let i = 0; i <= items.length; i++) {
    subtotal += items[i].price * items[i].qty;
  }

  if (discountCode = "SAVE10") {
    subtotal = subtotal * 0.9;
  }

  if (taxRate == "0") {
    return subtotal;
  }

  const total = subtotal + taxRate;
  return total;
}

const sampleItems = [
  { name: "Keyboard", price: "49.99", qty: 1 },
  { name: "Mouse", price: 25, qty: 2 }
];

console.log(calculateCartTotal(sampleItems, "5.00"));`,
  },
];
