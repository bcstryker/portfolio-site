import {kanbanCols, item} from "pages/productivity";
import {FC} from "react";
import {DragDropContext, Droppable, Draggable, DropResult} from "react-beautiful-dnd";
import {SetFunction} from "types";
import {PlusIcon} from "@heroicons/react/solid";
import {v4 as uuid} from "uuid";

const Kanban: FC<{cols: kanbanCols; setCols: SetFunction}> = ({cols, setCols}) => (
  <div className="justify-center flex flex-col">
    <DragDropContext onDragEnd={(result) => onDragEnd(result, cols, setCols)}>
      {Object.entries(cols).map(([colId, col]) => (
        <div key={col.name} className="px-4">
          <div className="flex justify-between">
            <h2>{col.name}</h2>
            <div className="hover:bg-background-glow">
              <PlusIcon
                className="h-4 w-4 hover:fill-background-glow cursor-pointer"
                onClick={() => addCard(cols, setCols, colId)}
              />
            </div>
          </div>
          <Droppable key={colId} droppableId={colId}>
            {(provided, snapshot) => (
              <div
                className="rounded-xl border border-foreground-alt-300 bg-background-light p-6"
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  backgroundColor: snapshot.isDraggingOver
                    ? "rgb(var(--color-foreground-alt-400))"
                    : "rgb(var(--color-background-light))",
                }}
              >
                {col.items.map(
                  (item, index) =>
                    item &&
                    item.id && (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className="rounded-xl"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              userSelect: "none",
                              padding: 16,
                              margin: "0 0 8px 0",
                              minHeight: "50px",
                              backgroundColor: snapshot.isDragging
                                ? "rgb(var(--color-foreground-alt-300))"
                                : "rgb(var(--color-foreground-alt-400))",
                              color: "rgb(var(--color-foreground-alt-100))",
                              ...provided.draggableProps.style,
                            }}
                          >
                            {item.content}
                            {/* <input
                              id={item.id}
                              className="bg-foreground-alt-400 text-foreground-alt-200 focus:outline-none"
                              placeholder={item.content}
                              onKeyUp={(event) => editCard(event, colId, item.id, cols, setCols)}
                              onSubmit={(text) => editCard(text, colId, item.id, cols, setCols)}
                            /> */}
                          </div>
                        )}
                      </Draggable>
                    )
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      ))}
    </DragDropContext>
  </div>
);

// this function is done and works well, no further work needed right now
const onDragEnd = (result: DropResult, cols: kanbanCols, setCols: SetFunction) => {
  if (!result.destination) return;
  const {source, destination} = result;
  if (source.droppableId !== destination.droppableId) {
    const sourceCol = cols[source.droppableId];
    const destCol = cols[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = [...destCol.items];
    const [removed] = sourceItems.splice(destination.index, 1);
    destItems.splice(destination.index, 0, removed);
    setCols({
      ...cols,
      [source.droppableId]: {
        ...sourceCol,
        items: sourceItems,
      },
      [destination.droppableId]: {
        ...destCol,
        items: destItems,
      },
    });
  } else {
    const col = cols[source.droppableId];
    const copiedItems = [...col.items];
    const [removed] = copiedItems.splice(source.index, 1);
    copiedItems.splice(destination.index, 0, removed);
    setCols({
      ...cols,
      [source.droppableId]: {
        ...col,
        items: copiedItems,
      },
    });
  }
};

// This will probably be enough for adding a card as long as I can figure out editCard() functionality
const addCard = (cols: kanbanCols, setCols: SetFunction, id: string) => {
  const col = cols[id];
  const copiedItems = [...col.items];
  setCols({
    ...cols,
    [id]: {
      ...col,
      items: [...copiedItems, {id: uuid(), content: "New Task."}],
    },
  });
};

// WIP
const editCard = (event: any, colId: string, itemId: string, cols: kanbanCols, setCols: SetFunction) => {
  if (event.code !== "Enter") return;
  const test = document.getElementById(itemId)?.innerHTML || "";
  console.log(test);
  const col = cols[colId];
  const copiedItems = col ? [...col.items] : [];
  const thisTask = copiedItems.find((t) => t.id == itemId) || ({} as item);
  const updatedTask: item = {...thisTask, content: test};
  copiedItems.splice(cols[colId].items.indexOf(thisTask), 0, updatedTask);

  setCols({
    ...cols,
    [colId]: {
      ...col,
      items: copiedItems,
    },
  });
};

export default Kanban;
